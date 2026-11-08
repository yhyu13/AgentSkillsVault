# Studio 与工具链

> 专业整理：Studio 与开发工具链工程师。依据 Remotion `4.0.532` 本地资料；本次未运行项目。命令与 API 均待目标项目复验。

**核心方法：把配置文件、命令行与实际生效配置分开取证；CLI flag 覆盖配置文件。**

## 1. 适用与不适用

适用于本地预览、合成选择、配置覆盖排查、热更新、打包与渲染衔接、迁移及 lint。不适用于把 Studio 当作生产渲染服务，也不替代编码、云部署或媒体转码方案。

## 2. 输入与输出

- 输入：入口、合成 ID、默认 props、依赖版本与锁文件、配置、静态资源、目标产物、浏览器/GL 环境。
- 输出：预览地址、合成清单、bundle、渲染产物，以及“有效配置—产物—差异”记录。

## 3. 七步工作流程

1. **识别项目**：检查 `package.json`、锁文件、实际入口与相关包版本。框架源码使用 bun，不代表用户项目必须改用 bun；沿用现有脚本与包管理器。
2. **选择动作**：`studio` 预览，`compositions` 列合成，`render`/`still` 输出视频/静帧，`bundle` 仅打包。资料还列出 benchmark、ffmpeg、ffprobe、gpu、versions、upgrade、add、validate、lambda、cloudrun、skills；不为未知参数猜默认值。
3. **建立有效配置表**：记录配置文件值、CLI 值和最终值。已确认 **CLI flag 高于 `remotion.config.ts/.js`**；不据此推导环境变量或 `--config` 的完整加载链。
4. **检查预览**：从 CompositionSelector 选合成，检查 Canvas、Timeline、属性面板及首/中/尾帧。服务端能读写默认 props、监听文件及热更新，不假定所有界面操作已写回源码。
5. **隔离构建**：先单独 bundle，检查入口、资源路径与打包错误，再进入逐帧渲染。打包成功不代表媒体就绪。
6. **对照渲染**：固定合成、帧和资源，核对并发、字体、解码、GPU/GL 后端；这些是排查维度，不是已证实的默认差异。
7. **验收留痕**：保存实际命令、有效配置、产物路径和关键帧。迁移可用基于 jscodeshift 的 codemods，动态拼接 JSX 需人工复核；ESLint flat/non-flat 配置不要混用。

## 4. 调用示例与证据边界

以下是调用骨架，假定项目已具备有效入口与依赖；**不是本次实跑成功的脚本**。完整安装、端口与 render/still 参数需项目复验。

```bash
npx remotion versions
npx remotion validate
npx remotion studio
npx remotion bundle
```

具体场景：修改 `remotion.config.ts` 后预览不变。检查文件名、运行目录与冲突 flag，重启 Studio，再用 bundle 隔离构建错误；热更新失效则检查网络盘/虚拟机监听。

## 5. 陷阱与检查清单

- 不混淆 browser-studio 实验模式与本地 Node 服务。
- 不把实时播放等同于逐帧捕获。
- 不把本机工具直接暴露为公共服务。
- 不把 AST 迁移当作完整升级。

检查项：

- [ ] 相关依赖版本一致，入口与合成 ID 正确。
- [ ] 有效配置可解释，界面引起的源码改动可追溯。
- [ ] 资源无 404，bundle 成功，同帧对照完成。
- [ ] 首尾帧与字体稳定，重复渲染符合项目验收标准。

## 6. 服务与能力边界

`studio` 提供界面，`studio-server` 提供本地服务及文件读写/监听能力，`studio-protocol` 定义消息，`studio-shared` 承载共享逻辑；`browser-studio` 是浏览器内实验特性。

资料记载 Figma 导入/导出及 `figma-clipboard.ts`、`figma-to-svg.ts`，但具体剪贴板流程、限制及任意 Figma 文件转换能力未能确认。

## 7. 来源映射

- `references/05-studio-devtools.md`：§1—3 界面/服务/共享层；§4 CLI 与配置；§5 迁移；§6 ESLint；§8 常见问题。
- `references/01-architecture.md`：§1 版本与包管理器；§4 渲染主流程。
- `references/03-render-pipeline.md`：§1、§6—8 并发、GL 与打包。
- `references/11-templates-qa.md`：§4 验收原则。

资料引用的源码位置：`packages/cli/src/load-config.ts`、`packages/studio-server/src/file-watcher.ts`、`packages/studio-server/src/preview-server/api-routes.ts`、`packages/studio-server/src/figma/figma-clipboard.ts`、`packages/studio-server/src/figma/figma-to-svg.ts`、`packages/core/src/version.ts`。本次未另行读取上游实现。

## 8. 待确认项

默认端口、`--config` 行为、render/still 必填参数、完整脚手架交互和全部 lint 规则名未由这些分册给全。同名渲染 API 不能直接当作 CLI 子命令。
