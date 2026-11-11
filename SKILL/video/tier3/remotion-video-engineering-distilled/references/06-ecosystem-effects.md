# 特效、转场与第三方库

> 专业整理：生态组件与特效工程师。资料基线：Remotion `4.0.532`。本次未查上游源码、未实跑，项目落地须复验。

**推荐包与导出**：着色器效果评估 `@remotion/effects` 的 `createEffect`；转场用 `@remotion/transitions` 的 `TransitionSeries/linearTiming`；三维接入评估 `@remotion/three` 的 `ThreeCanvas`。

## 适用与不适用场景

适合品牌动画、视频转场、字体驱动排版，以及 Three.js、Lottie、Skia 等资产接入。高风险或不适用：缺少特效所需 WebGL2；完全离线却只配置 CDN 字体；要求完整保留 AE 表达式及部分混合模式。

**输入**：视觉目标、尺寸/帧率/时长、媒体资产、字体子集与字重、依赖版本、渲染环境。**输出**：可复现的 React 合成、效果参数预设、资源就绪门控和真实渲染验收记录。

## 六步流程

1. **效果选型：先确认导出，再设计参数。** 分册记载效果可挂元素或 `Sequence`，关键帧可驱动参数。`createEffect` 的 core/effects 双入口归属仅是资料记载，实际导入路径、完整签名、Params/State 和关键帧格式待确认，不能据此直接编写可用 import。按“着色器常量＋Params＋State＋组件”核对实现，不从目录名猜公开组件名。20个特效目录不等于20个公开导出；`glow`、`light-trail` 的多 pass 顺序待复验。
2. **字体先于排版定稿。** `@remotion/google-fonts` 的 `loadFont()` 返回 `FontInfo`，含 `fontFamily`、`fonts`、`unicodeRanges`、`waitUntilDone()`。明确子集和字重；多字重可评估 `loadVariableFont`。CDN 字体用 `delayRender()` 阻塞，等待完成后配对 `continueRender()`，同时处理失败与清理。离线评估 `packages/fonts` 的本地字体 API，具体导入待核。家族数按生成数据文件统计，不能把1,880个包文件当家族数。
3. **动画按帧重建。** 用 `useCurrentFrame()` 驱动 `interpolate()`，显式约束越界；`Sequence` 内是相对帧。三方动画、纹理和噪点也应能按指定帧重建，不用墙钟或 `Math.random()` 决定画面。平滑随机选 `@remotion/noise` 的 `noise2D/noise3D/noise4D`。
4. **转场计入时长。** 使用 `TransitionSeries.Sequence/.Transition/.Overlay`。`linearTiming({durationInFrames, easing?})` 控制时长和曲线；`springTiming({config, durationInFrames?, durationRestThreshold?})` 使用弹簧配置，可选目标时长与停稳阈值。**仅对普通相邻重叠转场的串联，且无其他 offset/overlay 等改变时长或排列的情况，才可用：总时长＝片段之和－转场之和。** 不推广至所有 Timeline 或复杂 Overlay 编排。30fps下 `linearTiming({durationInFrames:12})` 表示12帧、约0.4秒；12是示例值。新旧 shader presentation 并存时须明确实现。
5. **三方库走适配层。** Three.js 用 `ThreeCanvas`、`useVideoTexture`、`useOffthreadVideoTexture`；资料记录 three catalog **0.178.0**，这不是完整 peerDependency 范围。Lottie 用 `<Lottie>`、`getLottieMetadata`，先验资产特性，表达式及部分混合模式不支持。Skia 的 `SkiaCanvas/enableSkia` 需 WASM 配置。Tailwind v3/v4 分包使用各自的 `enableTailwind`，不可混用；canvas 就绪前不放行捕获。
6. **以真实渲染计成本。** 预览流畅不代表渲染快；多 pass、三方初始化、库体积和相机运动模糊均需预算。先小样测耗时与内存，再调分辨率、效果和并发。没有合适效果时，降级为核心帧映射驱动 CSS/SVG，不补造包导出、默认值或参数范围。

## 完整使用示例

以下是不依赖 WebGL 的核心 API 淡入入口示例。未实跑，非即插即用生产模板：

```tsx
import React from 'react';
import {
  AbsoluteFill, Composition, registerRoot,
  useCurrentFrame, useVideoConfig, interpolate,
} from 'remotion';

function FadeIn() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{
    backgroundColor: 'white', justifyContent: 'center',
    alignItems: 'center', fontSize: 80, opacity,
  }}>Hello</AbsoluteFill>;
}

function Root() {
  return <Composition id="FadeIn" component={FadeIn}
    width={1080} height={1080} fps={30} durationInFrames={90}/>;
}
registerRoot(Root);
```

`[0,fps*0.8]` 表示前0.8秒；`[0,1]` 是不透明度范围；两端 `clamp` 分别固定为0和1。1080²、30fps、90帧和80px都是示例配置，不是默认值。

## 检查清单与待复验

- 冷启动首帧字体正确、子集不缺字；失败不静默换字或遗留门控。
- 同一帧重复 seek 一致；转场边界不闪帧，重叠扣除符合具体编排。
- 预览与真实无头渲染分别验收；核对 WebGL2、WASM、依赖版本和内存。
- 待复验：`createEffect` 双入口与完整签名、具体特效导出/参数范围、字体家族导入路径、多 pass 顺序、三方 peer 范围及性能数值。分册不足，不作确定承诺。

## 来源映射

- `references/08-ecosystem-effects.md`，真实标题“08 · 生态组件与特效（effects / transitions / 第三方集成 / 字体）”：§1特效、§2转场、§3第三方集成、§5字体、§6常见坑。资料定位：`packages/effects/src/index.ts`、`packages/effects/src/glow/glow-runtime.ts`、`packages/transitions/src/index.ts`、`packages/transitions/src/timings/linear-timing.ts`、`packages/transitions/src/timings/spring-timing.ts`。
- `references/02-core-authoring.md`，“02 · 核心作者层（帧模型 · 合成 · 动画）”：§1帧模型、§2合成注册、§3相对帧、§4插值、§8门控。定位：`packages/core/src/Composition.tsx`、`packages/core/src/use-current-frame.ts`、`packages/core/src/interpolate.ts`、`packages/core/src/delay-render.ts`。
- `references/01-architecture.md`，“01 · 总体架构与九大领域”§1“仓库规模”：版本定位 `packages/core/src/version.ts`；生成字体数据影响规模统计。以上源码路径均来自资料，并非本次逐文件核验结果。
