# Provenance

- 来源类型：local（真实交付蒸馏）
- 上游（方法）：Warp `warpdotdev/common-skills` 的 `.agents/skills/skill-doctor/`，MIT，抓取于 2026-11-11。
  使用了它的评分维度名称、四档标签语义、`insufficient_evidence` 规则、加权公式与「只从失败会话取证」
  的改写纪律；正文、脚本、模板、闸门、回归与边界为本版重写。
- 上游（讲解）：B 站 BV1dYt46kEMw《Skill Doctor：会自我改进的 Agent》，公开接口时长 532 秒，
  实际下载 852×480 / 531.64 秒 / 11.75 MB。
- 交付项目：`C:/Git-repo-my/个人成长/skill-doctor-bili/`（总结、课件、口播片、评审记录）。
- 与原版的差别：原版依赖它的会话收集器与报告渲染器；本版把机械部分收成三个可独立运行的脚本
  （收集校验、加权计分、改动闸门），补了人工合并门、回滚、黄金集回归、注入与隐私边界，并附自测。
- 许可：MIT（见 LICENSE）。
- 维护：行为有变化时 bump `version`，并同步 `examples/worked-example.md` 的口径。
