---
name: apk-ndk-version-check
description: Check which Android NDK / clang version built an APK's native library (libUE4.so, lib*.so) — works even when the ELF section table is stripped (UE Shipping builds), maps "based on rXXXXXX" revisions to NDK releases via changelog, and cross-validates with libc++_shared.so. Use when asked to check NDK version, clang version, compiler version of an APK or .so, or to figure out which toolchain built a native library.
version: 1.0.0
metadata:
  category: android-build
  created_by: agent
---

# APK NDK Version Check

**结论先行**：NDK 版本写死在 `.so` 的编译器签名串里，格式为
`Android (<build-id>[, +pgo, +bolt, ...], based on r<LLVM rev>) clang version <X.Y.Z>`。
先走标准 ELF 探测，探测不到（节头被裁）就全文扫字符串，用 `based on r…` 修订号查 NDK changelog 定版到具体字母版本，再用 `libc++_shared.so` 交叉验证。

## When to use

- 用户给出 APK 或已解包目录，问 NDK 版本 / 编译器版本 / clang 版本
- 问某个 `lib*.so`（尤其是 `libUE4.so`）是用哪个工具链编的
- 对比两个包的原生库工具链是否一致

## 环境

本机 Python 2.7.18（32 位）。两个脚本都用 `br"..."` 字节串和 `ord(x[0:1])` 写法，py2/py3 通用。验证过的机器只有 py2.7，脚本失败先怀疑 py3 语法回退问题。

## Workflow（按序降级，每步都有判停条件）

### Step 1 — 定位 so

先找已解包目录（用户常给两个路径：`.apk` + 同名无后缀目录）。目标在 `lib/<abi>/` 下，UE 包是 `lib/arm64-v8a/libUE4.so`，另取同目录 `libc++_shared.so` 备用（Step 5 用）。

只有 `.apk` 时解包：

```
python -c "import zipfile; zipfile.ZipFile(r'<apk路径>').extractall(r'<目标目录>')"
```

### Step 2 — 标准 ELF 探测（authoritative，先试）

```
python <skill目录>/scripts/elf_probe.py <path.so>
```

脚本输出 ELF class、节头数、PT_NOTE 内容。判定：

- 节头齐全（几十上百个节）→ 找 `.comment` 段，clang 签名串就在里面，跳到 Step 4
- 有 PT_NOTE 且含 `ndk_version` 描述串 → 直接得 NDK 字母版（较新 NDK 的 crtbegin 才写，不是必有）
- **UE Shipping 包常见**：节头只剩 4~6 个、PT_NOTE 只有 GNU build-id → 走 Step 3

### Step 3 — 全文扫编译器签名串（本 workhorse）

```
python <skill目录>/scripts/scan_clang_strings.py <path.so> [更多.so...]
```

输出所有去重后的 `Android (...) clang version ...` 串。一个 so 出 5~10 个不同版本串是正常的——静态链接进来的各第三方 SDK 各带各的工具链。**不要用出现次数判断主体**：`.comment` 已被链接器去重，每个串只留一份。

### Step 4 — build-id 映射 NDK（先定家族，再查 changelog 定字母）

两段信息，用法不同：

1. `clang version X.Y.Z` — 定 NDK 家族（大版本），对应关系见下表
2. `based on r<LLVM rev>` — 查 [NDK changelog](https://github.com/android/ndk/wiki/Changelog-rXX)（websearch `NDK changelog rXX "r530567d"`）定到具体字母版（r28b / r28c…）

**坑**：括号里的 `<build-id>` 是工具链构建号，不总等于 gradle `ndkVersion`。r28b 恰好两边都是 13324770，r26 系列则不相等——不要拿 build-id 反查 gradle 版本号，用 LLVM 修订号查 changelog 才可靠。

### Step 5 — libc++_shared.so 交叉验证

对 Step 1 留下的 `libc++_shared.so` 跑同一个扫描脚本。它是 NDK 自带组件、随引擎构建所用 NDK 打包，其**主体**签名串应与 libUE4.so 中的最新串一致。判定规则：

- 两者一致 → 该版本就是引擎构建的 NDK，出结论
- libc++_shared 主体是旧版本串、libUE4.so 里才有新串 → 怀疑引擎没用新 NDK，向用户标注矛盾再下结论

## 映射表（家族级，r28b 已 changelog 复核）

| NDK | clang | LLVM base 修订号（查 changelog 用） | 状态 |
|---|---|---|---|
| r18 | 6.0.2 | r316199 | 串实测 |
| r20 | 9.0.8 | r365631c | 串实测 |
| r21 | 9.0.8 | r365631c1 | 串实测 |
| r23 | 12.0.5 | r416183b | 串实测 |
| r24 | 12.0.8 | r416183c1 | 串实测 |
| r25 | 14.0.7 | r450365d | 待复核 |
| r26 | 17.0.2 | r487747e | 串实测 |
| r27 | 18.0.x | r522817 | 串实测 |
| r28 | 19.0.0 | r530567a（r28b=d, r28c=e） | 已复核 |
| r29+ | — | 用同一套 changelog 方法查 | — |

表只做家族级速查；**报给用户的字母版必须经 changelog 复核**，缺材料就标"待确认"，不补虚构出处。

## 多版本串的解读模板

报结论时按这个结构，别把第三方 SDK 的老 NDK 说成引擎的：

> libUE4.so 由 NDK rXXb（clang A.B.C）构建；另检出 NDK r18/r20/r21/r23b/r24/r26d 等串，来自静态链接的第三方 SDK 历史产物，`.comment` 去重后无法反推具体哪个 SDK 用哪个 NDK。

## 已验证案例（本 skill 的诞生场景，2026-09-10）

- 包：`Torch_ReviewUGS_Shipping_5956938_Release_fc7af9a2.1788945322.apk`（已解包目录）
- libUE4.so：198,475,776 字节，节头仅 6 个、PT_NOTE 仅 GNU build-id（`39e3c1c9...`，SHA1）→ Step 2 判停，走 Step 3
- 扫出 8 个工具链串，最新为 `Android (13324770, +pgo, +bolt, +lto, +mlgo, based on r530567d) clang version 19.0.0`
- changelog 复核：r28b 更新至 `clang-r530567d`，r28c 为 `r530567e`（build 13676358）→ 定 **r28b**
- 交叉验证：libc++_shared.so 主体串一致（内嵌一段 NDK r27/clang 18 组件串，属预编译 unwind，不影响判定）
- 结论：**NDK r28b（gradle ndkVersion 28.1.13324770）**，与包名 `android_36`（targetSdk 36）吻合——r28 起 16 KB page size 兼容默认开启

## Pitfalls

- UE Shipping 把节头表裁到只剩个位数、UE 版本串（`++UE4+Release-*`）也被裁——都不是异常，直接走字符串扫描
- 198 MB 的 so 全文扫描在 py2.7 + mmap 下秒级完成，不要先读进内存
- `strings` 命令能干同样的事，但 Windows 上未必装了；脚本方案零依赖
- 只报一个版本号不够：同时报 clang 版本、LLVM 修订号、NDK 字母版、gradle ndkVersion，四者是不同坐标系
