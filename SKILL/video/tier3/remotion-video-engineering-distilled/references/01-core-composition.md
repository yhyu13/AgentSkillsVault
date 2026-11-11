# 核心合成与时间轴

> 专业整理：核心合成与时间轴工程师。依据 Remotion `4.0.532` 本地资料；本次未运行代码或复核上游实现。

**核心方法：将任意时刻表达成当前帧的确定性函数；先画时间轴，再实现视觉样式。**

## 1. 适用与不适用

适用于用 React 编写可重复渲染的视频、标题、数据动画、场景串联和参数化模板。需要明确分辨率、fps、总帧数、输入参数、素材与验收条件。

不适用于把实时网页动画原样当作离线合成，或仅凭 API 名称承诺所有动画特性。需要交互状态时，先把状态与帧号的关系设计清楚，再验证 seek 与导出。

## 2. 输入、处理与输出

- 输入：fps、尺寸、durationInFrames、文案/数据、字体与媒体、时间轴和可重复性要求。
- 处理：参数校验 → 帧级时间轴 → 纯函数动画 → 资源就绪 → 边界检查 → 重复渲染。
- 输出：Composition、分段时间表、关键帧状态、可重复的素材/随机种子清单。

## 3. 八步工作流程

1. **建立帧模型**：使用 `useCurrentFrame()` 与 `useVideoConfig()`。30fps 的第 30 帧对应 1 秒，但组件应围绕帧号求状态，不依赖墙钟时间。
2. **注册合成**：明确 `id`、`component`、`durationInFrames`、`fps`、`width`、`height`；需要动态尺寸/时长时核对 `calculateMetadata`，参数校验使用项目版本支持的 schema。
3. **编排时间轴**：`Sequence` 的 `from` 按父时间轴解释；仅在无时间偏移的顶层，其起点才与全局帧一致。嵌套时按父时间轴累计偏移，不能一概称为全局绝对帧。内部 `useCurrentFrame()` 从当前片段的 0 帧开始；`Series` 自动累计时长。预挂载、延后卸载与布局包装是不同概念，不应混同。默认 `layout='absolute-fill'`；`layout='none'` 不生成默认包裹容器。
4. **计算动画**：`interpolate` 的输入/输出数组等长，`inputRange` **严格递增**，明确左右越界策略。资料默认外推为 `extend`，不希望越界变化时显式设置 `clamp`。
5. **确定弹簧停稳时间**：检查 `spring` 的 `fps`、`frame`、config、delay 与 durationInFrames；用 `measureSpring` 理解视觉停稳所需帧数，避免动画未结束就切场。
6. **固定随机性**：使用有稳定种子的 `random`，不要依赖 `Math.random()`、`Date.now()` 或未约束的异步完成时序。
7. **等待资源**：字体、图片和媒体需要就绪；对异步加载管理 `delayRender()` / `continueRender()`，避免遗漏完成或永久等待。具体配对与超时策略须项目复验。
8. **验收边界**：检查 0、N−1、段落交界、转场中点、动画结束、素材未就绪和动态 props。固定输入重复渲染，核对首尾、帧数与稳定性。

## 4. 关键机制与陷阱

| 主题 | 资料记载 | 项目检查 |
|---|---|---|
| Sequence | `from` 按父时间轴解释，内部帧相对当前片段 | 仅在无时间偏移的顶层，起点才与全局帧一致；嵌套时累计父偏移 |
| interpolate | 默认 `extrapolateLeft/right='extend'` | 数组严格递增、长度一致、明确越界行为 |
| spring | damping=10、mass=1、stiffness=100、overshootClamping=false | damping 必须大于 0；固定时长与停稳时间分别检查 |
| Easing | 提供纯函数缓动，不依赖浏览器动画引擎 | 不把所有 easing 名称当作跨版本稳定承诺 |
| random | 种子确定，返回 [0,1) | 固定种子；跨版本/平台的精确结果仍须复验 |
| calculateMetadata | 可动态决定尺寸、时长与 props | 校验返回值与总时长，避免小数/非法帧数 |

资料中 `interpolateColors` 被描述为 HSL 路径；这不应被推广为“HSL 对所有颜色都感知均匀”。颜色质量仍以关键帧视觉检查为准。

## 5. 资料措辞校正

02 §4 使用“单调递增”，§9 又写“严格递增，否则行为未定义”。本包采用 **严格递增** 作为工程约束，防止零长度区间；不沿用“未定义行为”这一未经本次源码核实的结论，也不承诺特定版本究竟抛出何种错误。

## 6. 检查清单

- [ ] 合成 id、fps、尺寸、总帧数明确。
- [ ] 总帧数 N 对应帧号 0…N−1。
- [ ] Sequence/Series 的全局帧、父时间轴与相对帧口径一致；嵌套偏移逐层累计。
- [ ] 插值范围严格递增、长度一致，左右外推显式说明。
- [ ] spring 的 damping 合法，结束/切场时间匹配。
- [ ] 字体、媒体和数据就绪，随机种子固定。
- [ ] 首尾帧、转场与边界无跳变。
- [ ] 相同输入与环境下重复渲染结果满足项目一致性标准。

## 7. 输入与输出示例

输入：30fps、90 帧、1920×1080。两个 `Sequence` 均置于**无时间偏移的顶层**：标题 `from=0`、`durationInFrames=60`；数据 `from=60`、`durationInFrames=30`。两者内部帧分别从 0 开始，此时全局起点才分别为 0、60；最后一帧是 89，不能误设为 90。

嵌套口径补充（工程示例）：若将数据片段放进起点为全局 30 帧的父 `Sequence`，并设子片段 `from=10`，其全局起点为 `30 + 10 = 40`，子片段局部帧 0 对应全局帧 40。该父片段须覆盖子片段完整区间；此处仅说明换算，不是本次运行记录。

## 8. 来源映射

- `references/02-core-authoring.md` §1“帧模型”、§2“Composition”、§3“Sequence / Series”。
- 同分册 §4“interpolate”、§5“spring”、§6“Easing”、§7“random”、§8“元数据与参数传递”、§9“常见坑”。
- 资料引用位置：`packages/core/src/use-current-frame.ts`、`packages/core/src/use-video-config.ts`、`packages/core/src/Composition.tsx`、`packages/core/src/Sequence.tsx`、`packages/core/src/interpolate.ts`、`packages/core/src/spring/spring-utils.ts`、`packages/core/src/random.ts`、`packages/core/src/delay-render.ts`。

以上源码位置为资料映射，本次未读取对应源文件；未确认的完整 API 签名应在目标版本查证。
