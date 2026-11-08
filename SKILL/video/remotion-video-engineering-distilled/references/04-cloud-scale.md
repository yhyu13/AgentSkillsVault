# 云端规模化渲染

> 专业整理：云端规模化渲染工程师。依据 Remotion `4.0.532` 本地资料；未执行部署、计费查询或源码复测。

**方法：先固定合成与环境，再比较分片粒度，最后用实际耗时、费用和质量选型；不要用并发数替代交付结果。**

## 1. 适用与不适用

适用：已具备可复现合成，需要缩短墙钟耗时，或接入 Lambda/Cloud Run 的分片、进度、存储和资源管理。

不适用：把不稳定合成直接搬到云端；仅凭资料给出精确云账单；承诺任意区域可用或所有客户端 SDK 功能等价。

## 2. 输入、处理与输出

- 输入：分辨率、fps、总帧数、codec/CRF、素材、目标区域、架构、预算、时限、账户配额及数据合规要求。
- 处理：本地基线 → 权限/区域检查 → 部署 → 分片 → 合并 → 质量与费用复核。
- 输出：部署清单、进度/错误证据、可验收媒体、成本记录及清理结果。

## 3. 七步流程

1. 固定依赖、浏览器、字体和素材，取得本地基线；记录渲染、编码、合并与上传阶段耗时。
2. 核对区域、CPU 架构、内存、磁盘、超时和并发配额，检查数据是否允许存到目标区域。
3. 检查 Lambda、S3、IAM、日志权限及桶策略。资料列出的四类资源为 Function、Layer、S3 bucket、IAM role；部署前确认日志等实际资源生命周期。
4. 用短样本比较不同 `framesPerLambda`，分别统计分片数、失败/重试、渲染、合并和总墙钟耗时。资料中的 API 包括 `deploySite`、`deployFunction`；完整签名待项目核对。
5. 用 `renderMediaOnLambda` / `renderMediaOnCloudrun` 启动任务，`getRenderProgress` 观察 `framesRendered`、`encodingProgress`、`overallProgress`、`cost`、`done`、`errors`、`fatalErrorEncountered`、`chunks`。进度接口能力不代表客户端完全无云凭据要求，具体鉴权需核对。
6. 对成片做帧数、时长、首尾、转场、音画和分片接缝检查；同时比较成功任务、失败重试和资源残留成本。
7. 按项目策略保留产物，调用资料列出的清理能力或核对控制台，确认函数、层、桶、角色及日志的存留符合预期。

## 4. 容量、成本与质量权衡

| 选择 | 收益 | 代价与边界 |
|---|---|---|
| 增大分片粒度 | 减少任务数及合并开销 | 单片更接近超时，重试代价更大 |
| 减小分片粒度 | 提高潜在并行度 | 请求、启动、上传和合并开销增加 |
| 提高内存 | 可能改善吞吐 | GB-秒成本与 CPU 配比须实测 |
| 降低 CRF | 可能改善画质 | 文件增大，影响编码、上传和费用 |

费用按区域核对 Lambda 计算、S3 存储/请求、数据传出及日志等，并计入重试。资料中的 `estimatePrice` 是估算能力，不是实时账单保证。

## 5. 平台边界与检查清单

资料记载的限制：Lambda 单次执行约 15 分钟、`/tmp` 默认 512 MB、可调上限 10 GB、内存 128 MB—10 GB。这些是该归档的口径，不能替代目标区域和账号的现行限制。

区域与架构：资料中的预置层排除了 `cn-north-1`、`cn-northwest-1`；`arm64` 层须匹配 `arm64` 函数。具体 Layer ARN、版本、冷启动行为和支持区域均须查当前环境。

多语言 Python/Go/Ruby/PHP SDK 是调用封装，不是完整浏览器/FFmpeg 渲染引擎，功能覆盖不能假定一致。

- [ ] 本地样片可重复渲染。
- [ ] 区域、架构、Layer 和浏览器一致。
- [ ] IAM/桶策略、数据地域与日志保留已确认。
- [ ] 分片、超时、配额和重试预算明确。
- [ ] 合并片通过帧与音画检查。
- [ ] 计费估算与实际记录已对照。
- [ ] 删除/保留策略已执行并复核。

## 6. 输入与输出示例

假设 1920×1080、30fps、30 秒，共 900 帧：比较每片 120 帧和 300 帧。**120/300 都是实验值，不是推荐最优值。** 记录分片、启动、渲染、合并、失败重试、总耗时与费用，再决定配置。不能把分片数简单等同于实际同时运行数。

## 7. 来源映射

- `references/06-cloud-scale.md` §2：`packages/lambda/src/index.ts`、`packages/lambda-client/src/index.ts`。
- §3：`packages/lambda/src/shared/hosted-layers.ts`、`packages/lambda/src/shared/multipart-upload-part-size.ts`。
- §4：`packages/lambda/src/shared/chunk.ts`、`packages/lambda-client/src/constants.ts`。
- §5：`packages/lambda-client/src/estimate-price.ts`。
- §7：多语言 SDK；§9：平台限制与排障。
- `references/01-architecture.md` §1、§4：版本与渲染主链背景。

**未能确认**：完整客户端导入签名、现行价格/限额、Layer 版本、许可门槛和所有 API 鉴权细节。API 能力清单来自 06 §2，不把 01 的链路图当作导入路径证据。
