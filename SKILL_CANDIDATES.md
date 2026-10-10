# 沉淀候选队列

> **规则**：Agent 在任务中发现的**可复用**经验，先写进这里，**不要顺手改 skill**。
> 用户批量审核后，才按条目改 skill（改时才 bump `version:` + 更新 `INSTRUCTION.md` 的 provenance 表）。
> 判断标准：能不能被**下一个任务复用**；一次性的项目细节不要进队列。
>
> 状态：`待审` / `已采纳` / `已否决` / `已落地`（写明落到哪）

## 队列

| # | 候选（一句话） | 证据（哪次实测） | 建议落位 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | **单文件交互演示的「迭代与验证」方法**：先能跑 → 再好看 → 再对；每轮用真实浏览器驱动 + 状态钩子 + 截图验证 | 做 AI Tutor World demo 时迭代 4 轮才修掉「云被画进世界坐标系 / 房子是纯色方块 / 生成时镜头没跟上 / 自动化驱动点不动」 | `karpathy-explain-better/references/modes.md` 形式 3 补「怎么迭代验证」 | 待审 |
| 2 | **把成片发布成可访问链接**（部署 + 公网自检） | Cloudflare quick tunnel（无账号凭据时唯一可行）；必须 curl 验到公网 200 与 206；quick tunnel 域名随机、随进程/机器失效 | `karpathy-explain-better/references/form4-video-delivery.md` 新增「发布」一节 | 待审 |
| 3 | **支持 Range 的最小静态服务** | `python -m http.server` 不支持 Range → 28MB 视频传到 10MB 断流；自写 40 行 `serve.py` 后本地/公网都返回 206 | `karpathy-explain-better/references/scripts/serve_range.py`（新脚本） | 待审 |
| 4 | **开工前的「考古式侦察」清单** | 先摸已有研究/资产/工具/凭据，本次靠它发现：父目录已有 `AI_Tutor-前1%研究`、`cloudflared` 在但无凭据（只能用 quick tunnel）、Bloom 调研与 issue #92 已存在不必重做 | `karpathy-explain-better` 默认工作流加「第 0 步：侦察」，或独立 skill | 待审 |
| 5 | **给 Agent 写的文档格式**：编号 + 路径 + 命令 + 判据 + 阈值；保留错误记录与自我更正；结尾给「起手式 prompt」 | issue #92 附录按这个格式写；用户反馈「要对 Agent 友好，因为 manager 会用另一个 Agent 来学习」 | `writing/` 新 skill，或作为 `karpathy-explain-better` 形式 1 的补充 | 待审 |
| 6 | **搜索插件的限流与「只给 URL」应对** | 并行 6 条 search_web 只成功 1 条（插件限流）→ 改 2 条一批；返回结果 snippet 多为空 → 用 `curl` + HTMLParser 抓正文核事实；每条结论标「已核/未核」 | 新 skill（research-with-plugins）或并入 `karpathy-explain-better/references/` | 待审 |
| 7 | **多会话并行冲突治理**：改 skill/共享目录前先 pull；同一 skill 一次只允许一个会话改 | 2026-10-07 两个会话同改 `karpathy-explain-better`，靠提交时撞在一起合并；2026-10-10 `AI_Tutor-World/build`、`tools/` 是另一会话产物 | 已写入 `INSTRUCTION.md` §沉淀流程 | **已落地** |

## 已采纳并落地的（供追溯）

| 经验 | 落位 | 证据 |
| --- | --- | --- |
| 时长只有一个事实来源（音频实测，估算只做备胎） | `references/form4-video-delivery.md` §1 | 分镜估算 290s vs 旁白实测 177.8s（差 39%），后半段音画全错 |
| 静帧推镜必须逐帧亚像素渲染（别用 `zoompan` 整数裁剪） | 同上 §2 + `references/scripts/render_pipe.py` | 冻结帧 15/39、抖动残差 0.161 → 逐帧渲染后 1/39、0.002 |
| 交付前跑抽帧最近邻校验 + 抖动量化（含阈值） | 同上 §3 + `references/scripts/verify_video.py` | 阈值标定表在 `references/scripts/README.md` |
| 字体失败即报错，绝不静默回退；图标不用 emoji | 同上 §5 + `SKILL.md` 常见坑 | `ImageFont.load_default()` 回退 = 10px 位图字体，中文豆腐块、字号全失效 |
| 体积不是质量指标（变小可能是卡顿症状） | `SKILL.md` 常见坑 | 卡顿版 16.7MB < 平滑版 28.8MB（重复帧白拿压缩率） |
