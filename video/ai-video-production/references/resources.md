# 社区资源清单

来源：余弦博客《用 Opus 5.5 做视频：制作流程与提示词资源记录》（2026-09-27）整理。
本 vault 已把下列仓库以 git submodule 形式 vendor 到 `vendor/`。

## 一、可安装的开源视频类 Agent Skill（本 vault 已 vendor）

| 仓库 | submodule 路径 | 用途 | 本 vault 装入 |
|------|----------------|------|--------------|
| remotion-dev/skills | `vendor/remotion-skills` | Remotion 官方 Agent Skills（12 个） | `video/remotion-*` |
| alexgreensh/anidoodle | `vendor/anidoodle` | 手绘风插画与动画，自带讲故事与配乐 | `video/anidoodle` |
| op7418/guizang-product-video-skill | `vendor/guizang-product-video-skill` | 读代码库、用真实组件做产品更新宣传片 | `video/guizang-product-video-skill` |
| browser-use/video-use | `vendor/video-use` | 让 Agent 帮你剪真实拍的素材 | `video/video-use`、`video/manim-video` |
| jakubkrehel/make-interfaces-feel-better | `vendor/make-interfaces-feel-better` | 打磨 UI 与动画细节 | `video/make-interfaces-feel-better` |
| feitangyuan/onetake | `vendor/onetake` | 一镜到底风格的产品发布片与功能演示 | `video/onetake` |
| MengTo/Skills | `vendor/mengto-skills` | 设计师向 Agent Skills（含全息卡用的 3D skill） | `video/mengto/*`（3D 16 + media 2 + codex 11） |
| lemomo-ai/lemo-opuscar | `vendor/lemo-opuscar` | 39 种纯代码影片风格库 + 导演/技术指南 | `video/lemo-opuscar` |

> 说明：博客还提到 `Transitions-dev`（基于 Transitions 动效库的 UI 动画 skill，只在 X 上发布，未找到公开仓库）与
> `ismoshushi/awesome-opus-video-skills`（开源视频 skill 索引，仓库当前 404）。两条均未安装。

## 二、作品 / 提示词索引仓库（本 vault 已 vendor，纯资料）

| 仓库 | submodule 路径 | 内容 |
|------|----------------|------|
| athemeroy/awesome-opus-5-5-videos | `vendor/awesome-opus-5-5-videos` | 1000+ Opus 5.5 视频索引，带原帖链接与做法说明 |
| opusvideo/awesome-claude-video | `vendor/awesome-claude-video` | 视频与动画精选，附原帖、提示词、流程，中英双语 |
| lemomo-ai/lemo-opuscar | `vendor/lemo-opuscar` | 39 种影片风格，每种一段可复用风格提示词 + 纯代码样片 |
| zhuyansen/awesome-opus-5.5-video | `vendor/awesome-opus-5.5-video` | 962 个作品全量清单，带原帖与数据，中英双语 |
| zhuyansen/awesome-claude-video-skills | `vendor/awesome-claude-video-skills` | 180 个开源视频 skill 与工具包，分 10 类，附安全评级 |

另有提示词页 `jasonzhu.ai/zh/prompts/claude-opus-5-5`：收录 252 个有出处的视频提示词，一键复制（未 vendor，仅记录）。

## 三、工具与素材

| 用途 | 站点 |
|------|------|
| 渲染框架 | Remotion `remotion.dev` / HyperFrames `github.com/heygen-com/hyperframes` / Three.js / `@remotion/three` / Blender（代码驱动） |
| 找参考片 | `whatships.com`（按风格翻产品发布视频） |
| 组件库 | `21st.dev`；更多见 IndieHub UI 组件分类 `indiehub.best/tool?category=ui-component` |
| 找灵感 | Inspora（网页 / 产品界面 / 视觉案例） |
| 配乐 | 让模型用 Python（numpy/scipy）合成，按小节卡场景；更专业接 ElevenLabs 音乐与音效 API |
| 配音 | edge-tts（免费稳定、没感情）/ Qwen3-TTS / IndexTTS（本地）/ MiniMax、豆包（云端） |

## 四、值得看的工作流（社区已验证的提速手段）

- Remotion 长片提速：并发 + GPU 渲染 + 复用浏览器实例 + 分集缓存 + 慢图层降采样 + 审片先降分辨率。
  社区实测：合集 21min → 9min，进度条图层 15min → 2min，单集 6min → 4min。
- 成本：Opus 5.5 缓存命中价为标准输入价的 5%（$0.20/百万 token），长视频任务靠缓存命中省额度。
