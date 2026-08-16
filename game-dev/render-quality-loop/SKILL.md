---
name: render-quality-loop
description: Screenshot a render from meaningful camera angles, evaluate whether it reaches "path-tracing quality", write down the evaluation, and improve the code in a loop. Use when user says "截图几个角度" / "评估渲染质量" / "够不够 path tracing 质量" / "写评估然后改代码" / "find key angles". Backed by scripts/screenshot-sweep.mjs (angle sweep) + scripts/evaluate-render.mjs (objective metrics).
metadata:
  type: workflow
  applies-to: render-quality, raymarching, path-tracing-quality, black-hole, visualization
  case-study: 11_blackhole (2026-08-16 commit — see §9)
---

# render-quality-loop（渲染质量循环）

> **核心理念**：先**截图几个角度**看清现状，再**诚实评估**「离 path-tracing 质量还差多远」，**把评估写下来**，然后**改代码**，重渲染，再评估——直到肉眼+客观指标都达标。别在没截图、没评估的情况下瞎改渲染参数。
>
> 这个 skill 的三阶段 = 用户的三句话：**① 截图扫角度 → ② 评估够不够好 → ③ 写评估 + 改代码**。
>
> **强制 deliverable**：`render/sweep/evaluation.md`（评估文档）——没写评估 = 没做这轮循环。详见 §6。
>
> **重要**：本文件给**抽象 pattern**。具体角度表 / 阈值 / 脚本路径都来自 [项目] 本身，不要复制 §9 case study 的具体数字。

---

## 1. 何时使用这个 skill

**Trigger 关键词**（任何一个）：
- 用户说 "截图几个角度" / "多角度截图" / "screen shot several angles"
- 用户说 "评估渲染质量" / "够不够好" / "path tracing 质量" / "是不是到位了"
- 用户说 "写评估然后改" / "写下来再改代码" / "iterate on screenshots"
- 用户对一张渲染图说 "还是有 X"（banding / 锯齿 / 噪点 / 过曝 / 太暗）——这是循环的新一轮输入
- 用户说 "find key angles" / "meaningful angles" / "关键角度"

**何时不使用**：
- 还没跑起来渲染（先让浏览器出图，再谈质量）
- 用户只要一张固定角度的图（那是 `scripts/render-image.mjs`，不是循环）
- 纯物理正确性校验（那是 smoke/verify.mjs，不涉及「好看」）

---

## 2. 哲学 / Why

### 2.1 为什么「先截图、再评估、再改」

| 错误路径 | 正确路径 |
|---------|---------|
| 看一个默认角度 → 直觉改参数 | 多角度截图 → 找「有意义的角度」→ 对每个角度评估 |
| 改完不评估 → 不知道好没好 | 改完重渲染 → 客观指标 + 肉眼 → 写评估 |
| 评估在脑子里 → 下次全忘 | 评估写进 evaluation.md → 下次循环有 baseline |

### 2.2 「有意义的角度」为什么重要

一个渲染项目有**无数个角度**，但只有少数几个是**关键角度**——它们能暴露质量问题（极限 case）：

| 角度类型 | 暴露什么质量问题 |
|---------|-----------------|
| 极限暗（星空/阴影） | banding 最明显（暗部灰阶少） |
| 极限亮（盘内缘/光子环） | 过曝 / 裁剪 / 高光溢出 |
| 近贴盘面（edge-on） | 透镜环 / D 形影子 / 多普勒不对称 |
| 正面（face-on） | 对称性 / 全盘细节 |
| 高自旋 vs 零自旋 | 帧拖拽 / D 形 vs 圆影子 |

**先粗扫 → 看 → 再细扫**：第一次截图覆盖「粗角度域」，Claude **看** 每一张，标出「哪些角度暴露了问题 / 哪些角度是 hero shot」，然后**只在这些角度附近加密**。不要一上来就细扫全部。

---

## 3. 三阶段循环（sweep → evaluate → improve）

> 每阶段都有 **deliverable** + **验证门**。一轮循环 = 三阶段跑完。停止条件 = 用户说停（或所有角度都达标）。

### Phase 1 — Angle Sweep（找有意义的角度）

**目标**：产出「有意义角度」的截图集 + manifest。

**步骤**：
1. **跑粗扫**（默认 manifest）：`node scripts/screenshot-sweep.mjs`（覆盖 §9 的 canonical 角度表：edge-on → face-on × spin）。
2. **看 + 分类**：Claude **逐张 Read** 截图，对每张标注：`hero / 有缺陷 / 无聊`，并记录「这张暴露了什么质量问题」。
3. **提炼关键角度**：找出「质量问题最集中」的角度区间 + 「最能当封面」的 hero shot。
4. **细扫（可选）**：在关键角度附近加密，写一个自定义 manifest：
   ```json
   { "shots": [ { "name": "edge-04deg", "tilt": 0.07, "spin": 0.998, "dist": 14 } ] }
   ```
   跑 `node scripts/screenshot-sweep.mjs --manifest my-shots.json`。

**关键原则**：**先粗后细**。粗扫 8-12 张够定位问题；细扫只在「角度变化快的区间」加密（如 edge-on 附近透镜环 2°→20° 变化剧烈）。

**Deliverable**：`render/sweep/*.png` + `render/sweep/manifest.json`（每张记录 tilt/spin/dist/亮度）。

### Phase 2 — Evaluate（评估是否达到 path-tracing 质量）

**目标**：给一个诚实的「离 path-tracing 质量还差多远」评估。

**两层评估**：

1. **客观指标**：`node scripts/evaluate-render.mjs render/sweep` → 输出 scorecard（§4 六维）。
2. **肉眼 + 物理**：Claude **逐张看**截图，对照 §4 rubric，用 `window.__blackhole` 校验物理（影子 D 形 / 光子环 / 多普勒）。

**模板**（必须给数字 + 结论，不粉饰）：
```
[项目] 离 path-tracing 质量: <X>%
  - banding:  ✅/🟡/❌  <数字>
  - aliasing: ✅/🟡/❌  <数字>
  - 动态范围: ✅/🟡/❌  <数字>
  - 物理正确: ✅/🟡/❌  <证据>
关键缺陷 3 个:
  1. <最刺眼>
  2. <次刺眼>
  3. <第三>
```

**关键原则**：**客观指标 + 肉眼结论都要**。指标能抓 banding/过曝，抓不了「光子环糊不糊」「盘内缘够不够白热」——这些只能肉眼判。

**Deliverable**：scorecard（进 evaluation.md，不必单独成文）。

### Phase 3 — Report + Improve（写评估 + 改代码）

**目标**：把评估写成 `render/sweep/evaluation.md`，并按评估改代码，重渲染验证。

**步骤**：
1. **写评估**（§6 模板）：逐张结论 + 关键缺陷 + 本轮改动。
2. **改代码**（按缺陷 → 改动的映射，§5.2）。
3. **重渲染 + 重评估**：回到 Phase 1/2，验证改动有效。
4. **commit**：改动 + 评估文档**同 commit**（doc 与代码不 drift）。

**关键原则**：**改代码必须带评估文档**，否则下一轮不知道「为什么改」「改好了没」。

**Deliverable**：`render/sweep/evaluation.md` + 代码改动（同 commit）。

---

## 4. Path-tracing 质量 rubric（6 维）

> 一个真实 path-tracer 渲染的黑洞应该是：无 banding、无锯齿、无噪点、动态范围正确、物理正确、细节锐利。用这 6 维打分。

| # | 维度 | 客观指标 | 肉眼判据 | 达标（path-tracing 质量） |
|---|------|---------|---------|--------------------------|
| 1 | **banding**（色带） | `evaluate-render` `banding.runs20` | 平滑辉光有没有同心环 | 辉光带 ≥20px 平坦游程 ≈ 0 |
| 2 | **aliasing**（锯齿） | `edge.hardPct` | 盘边/影子边/光子环有没有 1px 阶梯 | 边缘 2-3px 软过渡，无阶梯 |
| 3 | **noise**（噪点） | `noise`（辉光 3×3 σ） | 有没有块状噪点（非 dither 细粒） | 只有 ~1 LSB dither 细粒 |
| 4 | **动态范围** | `range.p01/p99/p999` | 影子够黑、盘够亮但不糊 | p01≈0（影子黑）、p99<255（不裁剪） |
| 5 | **物理正确** | `__blackhole` 探针 | 影子 D 形 / 光子环 / 多普勒不对称 | 与 `kerrShadowOutline` 一致 |
| 6 | **细节** | `entropy` + 肉眼 | 光子环锐、盘内缘白热 | 光子环清晰、内缘最亮褪红外缘 |

**注意**：这 6 维里，**1/3/4/6 部分可量化**，**2/5/6 主要靠肉眼 + 探针**。指标是「线索」，肉眼是「判决」。

---

## 5. 脚本工具箱

### 5.1 三个脚本

| 脚本 | 作用 | 输入 | 输出 |
|------|------|------|------|
| `scripts/screenshot-sweep.mjs` | 多角度截图 | 默认 manifest 或 `--manifest` | `render/sweep/*.png` + `manifest.json` |
| `scripts/evaluate-render.mjs` | 客观质量指标 | `render/sweep/` | scorecard 表 + `quality.json` |
| `scripts/render-image.mjs` | 单张 4K hero 图 | — | `render/blackhole-4k.png` |

**前置**：dev server 在 5188 跑着（`npm run dev`）。

### 5.2 缺陷 → 改动映射

| 缺陷（评估发现） | 改哪里 | 落点 |
|-----------------|--------|------|
| banding（色带） | dither 强度 / 抖动分布 / bloom radius | `src/engine/shaders/dither.ts` + `SceneManager` bloom |
| aliasing（锯齿） | 超采样 / 解析式 AA / 边缘软化 | `src/engine/shaders/blackhole.ts`（ray 多采样）+ composer |
| 过曝 / 裁剪 | exposure / tonemap / 盘亮度 | `DEFAULT_PARAMS.exposure` + `diskBrightness` |
| 太暗 / 灰 | exposure / bloom strength / 盘温 | `DEFAULT_PARAMS` |
| 光子环糊 | 步数 / 步长控制 / 光子壳风数 | `blackhole.ts` `uSteps` / RK4 `dt` |
| 影子形状不对 | Kerr 测地线 / 种子 | `src/core/physics/kerr.ts` + GLSL 同构 |
| 盘内缘不够白热 | 黑体拟合 / 零扭矩内缘因子 | `blackhole.ts` `sampleDiskKerr` + `blackbody()` |

> **每改一处 → 重渲染 → 重评估 → 更新 evaluation.md**。改渲染参数不验证 = 白改。

---

## 6. Deliverable：`render/sweep/evaluation.md`（强制）

> 一轮循环的产物。没写 = 没做。每轮追加一节（迭代 N），别覆盖旧节（保留历史可回溯）。

```markdown
## 迭代 N（日期）— 结论：<一句话>

### 逐张评分（对照 §4 六维）
| shot | 角度 | banding | aliasing | 动态范围 | 物理 | 细节 | 结论 |
|------|------|---------|----------|---------|------|------|------|
| edge-03deg | 2.9° | ❌ 115 | 🟡 3% | ✅ | ✅ D形 | 🟡 | hero，但 banding 残留 |

### 关键缺陷（top 3-5）
1. <缺陷> — 证据：<指标数字 / 肉眼观察>
2. ...

### 本轮改动
- <文件>: <改了什么> → <为什么>（对应哪个缺陷）

### 下一轮
- 需要重扫的角度 / 需要调的参数 / 待验证的假设
```

---

## 7. Anti-patterns

### ❌ 反模式 1 — 不截图就改
> "感觉暗了，调高 exposure"
**问题**：单角度 + 直觉，改完不知道别处崩没崩。
**正解**：先扫 8-12 个角度，看清全局再改。

### ❌ 反模式 2 — 只扫一遍，不找关键角度
> "默认 manifest 跑一遍就完了"
**问题**：粗扫角度可能正好错过「问题最严重」的角度（如 edge-on 透镜环变化最快的 2°-20°）。
**正解**：粗扫 → **看** → 在关键角度加密细扫。

### ❌ 反模式 3 — 只看指标不看图
> "banding.runs20 = 0，达标了"
**问题**：指标抓不了「光子环糊」「内缘不够白热」「构图丑」。
**正解**：指标 + 肉眼**都要**，肉眼是判决。

### ❌ 反模式 4 — 改了代码不写评估
> 改了 dither / exposure，commit 了，但 evaluation.md 没动
**问题**：下一轮不知道「为什么改」「改好了没」。
**正解**：改动 + evaluation.md **同 commit**。

### ❌ 反模式 5 — 追求「完美」没有停止条件
> 无限调参数，永远不 ship
**问题**：渲染质量是主观的，没有客观 stop。
**正解**：以 §4 六维达标为 stop 信号；用户说停即停。

---

## 8. 验证这个 skill 是否工作

每轮循环后问自己：
- [ ] 有没有先跑**粗扫**（8-12 张）再看，而不是直接细扫？
- [ ] 有没有**逐张看**截图，标出 hero / 有缺陷 / 无聊？
- [ ] 有没有在关键角度**加密细扫**？
- [ ] 评估有没有**客观指标 + 肉眼结论**双给？
- [ ] 评估有没有对照 §4 **六维** rubric（不是只盯着 banding）？
- [ ] 物理有没有用 `__blackhole` 探针校验（不是只看好看）？
- [ ] 有没有写 **evaluation.md**（逐张评分 + 关键缺陷 + 本轮改动）？
- [ ] 改代码 + 评估文档是不是**同 commit**？
- [ ] 改动后有没有**重渲染 + 重评估**（闭环）？

9 个 ✅ = 循环健康。<6 个 = 漏了某步，回去补。

---

## 9. Case Study — 11_blackhole（2026-08-16）

> **本节是唯一的具体参考**，其他章节都是抽象 pattern。在别的项目用这个 skill，**不要复制本节的具体数字**——角度表 / 阈值 / 脚本路径都来自 11_blackhole 本身。

### 9.1 项目背景

- **项目**：`11_blackhole` — Kerr 旋转黑洞逐像素测地线光线追踪（raymarcher + bloom + dither）
- **本次**：把「多角度截图 → 评估 → 改代码」固化成 skill + 脚本

### 9.2 关键角度表（canonical sweep）

| 角度 | tilt (rad/°) | 暴露的质量问题 | 用途 |
|------|-------------|---------------|------|
| **edge-03deg** | 0.05 / 2.9° | 透镜环 + D 形影子 + 多普勒不对称 | hero shot（Gargantua） |
| edge-09deg | 0.15 / 8.6° | 透镜环分离过渡 | 细扫区间下界 |
| edge-17deg | 0.30 / 17° | 透镜环消失过渡 | 细扫区间上界 |
| edge-29deg | 0.50 / 29° | 盘开始打开 | 过渡 |
| 3q-40deg / 57deg | 0.70 / 1.0 | 3/4 视角、盘细节 | 中间态 |
| face-80deg / 89deg | 1.40 / 1.55 | 对称影子 + 全盘（无帧拖拽） | face-on |
| edge-spin0/05/09 | 0.05，spin 0→0.9 | 帧拖拽 D 形 vs 圆影子 | 自旋对比 |

### 9.3 首轮 sweep 实测（`screenshot-sweep.mjs --dsf 1`）

11 张，亮度随角度单调（edge-on 24.7 → face-on 8.1），随自旋单调（spin0 77.5 → spin0.9 35.6）——**证明相机 pose + 自旋都正确生效**。

### 9.4 首轮评估实测（`evaluate-render.mjs`）暴露的真实缺陷

| 缺陷 | 证据 | 方向 |
|------|------|------|
| **spin0 edge-on 过曝** | `p99=249`（近裁剪）、`runs8=17800` | 调 exposure / 盘亮度 / 环能量 |
| **banding 残留** | 各角度 `runs20≈110-180`（辉光带） | 继续调 dither / bloom |
| **aliasing ~3%** | `edge.hardPct≈3%`（1 sample/px 硬边） | 超采样 / 解析式 AA |

### 9.5 关键 takeaway（给下一个项目）

- ✅ 「先粗扫 → 看 → 细扫」比「一上来细扫全部」省 10× 时间
- ✅ 「客观指标 + 肉眼」双给，指标抓 banding/过曝，肉眼抓光子环/构图
- ✅ 亮度随角度/自旋**单调**是「相机 pose 生效」的快速信号
- ❌ 11_blackhole 的「0.05/0.15/0.30 rad」角度表不可复制——角度 = 项目几何决定
- ❌ 11_blackhole 的「edge-spin0 p99=249」是历史缺陷，不是 pattern

---

*整理人：用户（需求）+ Claude（执行）· 事实来源 = 11_blackhole 脚本 + 首轮 sweep/eval 实测 · 版本 v1（2026-08-16）*
