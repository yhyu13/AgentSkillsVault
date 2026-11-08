# 2026-11-08 批量导入与评分（studio packs / UE 专家团 / Remotion 蒸馏）

导入来源是用户给出的六个目录。其中三个不含 `SKILL.md`（角色能力文档或 zip 包），
实际可安装为 13 个 skill。

## 来源 → 安装位置

| 来源 | 形态 | 结果 |
|---|---|---|
| `D:\GitRepo-AI\AIGameMaker\documents\skills\dist\*.zip` | 7 个单 skill 包 | 装 7 个 → `SKILL/game-dev/game-*` |
| `D:\GitRepo-AI\AIGameMaker\docs\game-dev-studio-skills\` | `roles/*.md` 角色文档，无 `SKILL.md` | 不安装（其打包产物即上面 7 个 zip；`game-development-studio-skills.zip` 是含 `_authoring/` 的重复聚合包，未整包入库） |
| `D:\GitRepo-AI\AIGameMaker\docs\video-motion-studio-skills\` | `roles/*.md`，无 `SKILL.md`、无打包产物 | 不安装（源码可作蒸馏素材，未生成 skill） |
| `D:\GitRepo-AI\AIGameMaker\family-edu-gamified-skills\` | 1 个 skill（20 文件） | 装 1 个 → `SKILL/knowledge-vault/family-edu-gamified-skills` |
| `E:\XD\P4V\tl_yuhang_preUGS\frontend\trunk\我的SKILL\UE专家团\` | 4 个 skill × 4 个历史版本 | 装 4 个顶层版本 → `SKILL/agents/colleague-ue-*`（`versions/v1..v4` 不入库） |
| `E:\XD\P4V\tl_yuhang_preUGS\frontend\trunk\Remotion视频工程技能蒸馏\` | 1 个 skill（13 文件） | 装 1 个 → `SKILL/video/remotion-video-engineering-distilled`（同目录 zip 为同内容副本） |

改名说明：`family-edu-gamified` → `family-edu-gamified-skills`，`ue-*` → `colleague-ue-*`，
均按 frontmatter `name:` 对齐（Agent Skills 要求 `name` == 目录名）。

## 评分方法

`docs/skill-capacity-audit/score_skills.py`（0–10，五维，全部取自磁盘可测属性）：

- A 契约与元数据 0–3：frontmatter 合法、`name`==目录、description 有实质且有触发语、version/license
- B 指令深度 0–2：正文体量、小标题、代码块
- C 载荷丰富度 0–2：`references/` `scripts/` `templates|assets|examples`
- D 链接完整性 0–2：正文引用的每个相对路径必须存在
- E 卫生/可执行性 0–1：无 TODO/占位标记、脚本非空壳

## 评分结果（来源目录实测）

| skill | 分数 | A | B | C | D | E | 断链 | 判定 |
|---|---|---|---|---|---|---|---|---|
| family-edu-gamified-skills | 7.00 | 2.0 | 1.0 | 1.5 | 2.0 | 0.5 | 0 | 完整 |
| game-audio-director | 6.65 | 2.5 | 1.7 | 0.75 | 1.2 | 0.5 | 2 | 可用，2 处 `assets/audio` 项目侧路径 |
| remotion-video-engineering-distilled | 6.50 | 2.0 | 1.0 | 1.5 | 2.0 | 0.0 | 0 | 完整骨架，缺 version/license |
| game-art-director | 6.45 | 2.0 | 1.7 | 0.75 | 2.0 | 0.0 | 0 | 完整 |
| game-quality-lead | 6.45 | 2.0 | 1.7 | 0.75 | 2.0 | 0.0 | 0 | 完整 |
| game-release-ops-lead | 6.45 | 2.0 | 1.7 | 0.75 | 2.0 | 0.0 | 0 | 完整 |
| game-studio-lead | 6.08 | 2.5 | 1.0 | 0.75 | 1.33 | 0.5 | 2 | 可用，2 处 `docs/architecture` 项目侧路径 |
| colleague-ue-prod-team-lead | 5.95 | 1.75 | 1.7 | 0.5 | 2.0 | 0.0 | 0 | 可用，自包含 |
| game-design-strategist | 5.65 | 2.0 | 1.7 | 0.75 | 1.2 | 0.0 | 2 | 可用，2 处项目侧文档 |
| game-engineering-lead | 5.31 | 2.0 | 1.7 | 0.75 | 0.86 | 0.0 | 4 | 可用，4 处项目侧文档（含 `docs/engine-reference`） |
| colleague-ue-engine-architect | 4.45 | 1.75 | 1.7 | 0.5 | 0.0 | 0.5 | 2 | 不独立：引用包外 `agents/*.md` |
| colleague-ue-app-specialist | 3.95 | 1.75 | 1.7 | 0.5 | 0.0 | 0.0 | 2 | 不独立：引用包外 `agents/*.md` |
| colleague-ue-tech-planner | 3.95 | 1.75 | 1.7 | 0.5 | 0.0 | 0.0 | 2 | 不独立：引用包外 `agents/*.md` |

汇总：13 个，均分 5.76，中位 6.08，最低 3.95，最高 7.00；7 个有断链，0 个缺 frontmatter，0 个名字不匹配。

## 判读（分数之外的实际情况）

1. **game-* 的断链大多是"项目侧文档"，不是打包错误。** 例如
   `docs/architecture/architecture.md`、`docs/engine-reference` 是让 agent 去读**当前项目**的架构文档，
   不在 skill 包内。D 维扣分是评分器的严格口径，不等于包坏了。真正可以改的是把这类路径写成
   "若项目存在 … 则读，否则按模板重建"，避免被当成必读文件。
2. **UE 四个的 D=0 是真问题。** `SKILL.md` 正文引用 `agents/ue-*.md` 第 19–45 行等，
   而 `agents/` 目录不在包内，原件只在
   `C:/Users/XINDONG/.workbuddy/plugins/marketplaces/experts/plugins/ue-prod-team/agents/`。
   包内带了 `persona_skill.md` / `work_skill.md` / `persona.md` / `work.md` / `meta.json` / `manifest.json`，
   是 distilly 的中间件格式，不是 skill 载荷目录。结论：**能读能用，但不自包含**。
3. **E=0 大多是误报。** 命中的是"待补充/占位符/未实现"这类**指令用词**
   （如"区分用户提供/已查看/待补充"、"不要填满占位符伪装需求已明确"），不是未写完的章节。
4. **C 偏低**是因为角色包把内容放在正文而不是 `references/`；`persona_skill.md` 等中间件不计入载荷。
5. 全部 13 个都缺 `version` / `license`，A 维因此拿不满；若后续要纳入 tier 管理建议补齐 frontmatter。

## 安装与分发

- 13 个全部进 `scripts/install-manifest.txt`（A=5：4 个 `colleague-ue-*` + `family-edu-gamified-skills`；
  B=8：7 个 `game-*` + `remotion-video-engineering-distilled`），tier 写在 `scripts/skill-tiers.txt`。
- `sync-skills.ps1` 分发到 1 个 canonical（`~/.claude/skills`）+ 13 个 junction 视图。
- 校验：`verify-install.ps1 -CheckViews` → `match=253 mismatch=0 missing=0`，
  `views: ok=3289 problems=0`。
