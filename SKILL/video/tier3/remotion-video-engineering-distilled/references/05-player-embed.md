# 播放器嵌入与交互

> 专业整理：播放器嵌入工程师。资料版本：Remotion `4.0.532`。本次未运行项目或复测上游源码；以下为资料记载与工程建议，不是平台实测证明。

**定性：网页播放与布局工程。Player 用于实时预览，不是生产渲染入口；`getScale()` 只查询缩放。**

## 1. 适用与不适用

- 适用：交互式视频预览、可编辑内容展示、自定义播放界面、列表静态缩略图。
- 不适用：生产批量出片、编码与云渲染调度；这些进入独立渲染链路。
- 输入：合成组件、inputProps、帧数、fps、画布尺寸及交互需求。
- 输出：可播放、定位、静音、全屏的网页预览，以及事件与状态记录。

## 2. 七步工程方法

1. **区分 Player 与 Thumbnail**：Player 提供播放交互；Thumbnail 只渲染单帧，不播放、不加载音频。ThumbnailRef 的业务方法只有 `getContainerNode()`、`getScale()`，另有事件接口。不要为所有静态封面实例化 Player；`useThumbnail` 的完整签名未载明，待复验。
2. **固定合成契约**：component、inputProps、durationInFrames、fps、compositionWidth、compositionHeight；按需配置 controls、loop、autoPlay、initialFrame、inFrame/outFrame、playbackRate 和 render* UI 接口。示例值不是默认值，render* 回调签名须核对。
3. **分离容器适配与等比缩放**：先给父容器明确尺寸，再检查合成比例。容器可用宽高不等于合成像素，留白不等于应改画布比例。资料仅记载 `getScale()` 和 `scalechange`，未记载 `setScale`、`setZoom`；不承诺主动缩放设置接口或具体缩放公式。
4. **使用资料载明的命令式控制**：见下表。返回 void 不代表媒体已加载或播放成功，业务状态用事件/查询接口同步。
5. **订阅并清理同一回调**：组件卸载时注销全部监听；订阅与注销必须使用同一函数引用。避免另建计时器与播放器帧状态竞争。
6. **协调音频、存储、SSR 与许可**：`numberOfSharedAudioTags` 控制共享 audio 元素，音量持久化使用 localStorage。Next.js 等场景隔离到客户端挂载；资料提及客户端组件中的动态导入及 `ssr:false`，实际项目结构须复验。`acknowledgeRemotionLicense` 声明不替代实际许可义务。
7. **做平台验收**：自动播放可能被拦截，iOS Safari 全屏支持有限；同一合成 Studio 正常而 Player 异常，先查媒体兼容、资源加载、用户手势和策略。优先用户点击播放；静音不保证所有环境允许自动播放。资料中的 playsInline 语义不能直接当作已确认的 Player prop。

## 3. PlayerRef 方法

| 能力 | 资料载明接口 |
|---|---|
| 播放状态 | `play(e?)`、`pause()`、`toggle(e?)`、`isPlaying()` |
| 帧定位 | `seekTo(frame)`、`getCurrentFrame()` |
| 回到起播点 | `pauseAndReturnToPlayStart()` |
| 音量与静音 | `setVolume(num)`、`getVolume()`、`mute()`、`unmute()`、`isMuted()` |
| 全屏 | `requestFullscreen()`、`exitFullscreen()`、`isFullscreen()` |
| 容器与缩放查询 | `getContainerNode()`、`getScale()` |

音量与 playbackRate 的合法范围、片段边界规则须目标版本复验。

## 4. 事件与载荷

Player 的 14 个事件：`seeked`、`pause`、`play`、`ratechange`、`scalechange`、`volumechange`、`ended`、`error`、`timeupdate`、`frameupdate`、`fullscreenchange`、`mutechange`、`waiting`、`resume`。Thumbnail 仅列 error、waiting、resume。

| 事件 | `e.detail` |
|---|---|
| seeked、timeupdate、frameupdate | `{frame}` |
| error | `{error}` |
| ratechange | `{playbackRate}` |
| scalechange | `{scale}` |
| volumechange | `{volume}` |
| fullscreenchange | `{isFullscreen}` |
| mutechange | `{isMuted}` |
| play、pause、ended | undefined |
| waiting、resume | `{}` |

## 5. 最小 API 示例

以下假定已有合法合成组件、输入数据和 PlayerRef，省略类型与项目结构；**未实跑，不是完整 React 项目**。

```tsx
const p = ref.current;
if (p) {
  const onFrame = (e: {detail: {frame: number}}) =>
    console.debug(e.detail.frame);
  const onScale = (e: {detail: {scale: number}}) =>
    console.debug(e.detail.scale);
  const onError = (e: {detail: {error: unknown}}) =>
    console.error(e.detail.error);

  p.addEventListener('frameupdate', onFrame);
  p.addEventListener('scalechange', onScale);
  p.addEventListener('error', onError);

  // 将此函数用于 React effect 的清理阶段。
  const cleanup = () => {
    p.removeEventListener('frameupdate', onFrame);
    p.removeEventListener('scalechange', onScale);
    p.removeEventListener('error', onError);
  };
}
```

```tsx
// 用户手势直接驱动播放；全屏能力仍取决于平台。
const togglePlayback = (e: React.SyntheticEvent) =>
  ref.current?.toggle(e);
const mute = () => ref.current?.mute();
const enterFullscreen = () => ref.current?.requestFullscreen();
```

## 6. 输入与输出验收表

| 输入/操作 | 期望观察，不代表实测 |
|---|---|
| 180 帧、30fps、960×540，initialFrame=0 | 首帧可见、比例正确 |
| 已挂载后 `seekTo(60)` | 查询接口与帧事件反映目标帧 |
| 用户点击 `toggle(e)` | play/pause 事件与实际状态一致 |
| 父容器宽度改变 | `getScale()` 与 scalechange 用于核对等比适配，不猜具体数值 |
| 卸载后重新挂载 | 无重复监听造成的重复日志或状态更新 |

## 7. 检查清单与待确认项

- [ ] 首帧与比例、播放/seek/结束、音量与静音。
- [ ] 进入及退出全屏、反复挂载、多实例音频。
- [ ] 后台切换、SSR/hydration、目标浏览器媒体兼容。
- [ ] props 默认值、render* 签名、音量/速率范围、片段边界。
- [ ] 音量持久化默认及键、共享音频容量、缩放算法、useThumbnail 签名。

不把以上未载明项写成确定常量；不把本机 Studio 或单个浏览器的通过推广为所有平台通过。

## 8. 来源映射

- `references/07-player-embed.md` §1：`packages/player/src/Player.tsx`、`packages/player/src/PlayerUI.tsx`。
- §2：`packages/player/src/player-methods.ts`。
- §3：`packages/player/src/event-emitter.ts`。
- §4：`packages/player/src/Thumbnail.tsx`、`packages/player/src/ThumbnailUI.tsx`、`packages/player/src/use-thumbnail.ts`。
- §5：`packages/player/src/calculate-scale.ts`、`packages/player/src/utils/calculate-player-size.ts`、`packages/player/src/volume-persistence.ts`、`packages/player/src/use-remotion-license-acknowledge.ts`、`packages/player/src/is-backgrounded.ts`、`packages/player/src/browser-mediasession.ts`。
- §6：SSR、iOS、自动播放与音频问题。
- `references/01-architecture.md` §1：版本定位 `packages/core/src/version.ts`。

以上路径来自分册，本次未读取相应上游实现。
