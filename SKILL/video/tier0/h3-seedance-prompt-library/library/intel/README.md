# 官方情报

本目录只保留**规格摘要**与**差异报告**，不含官方原文副本。

- `official-facts.md` —— 从 MiniMax 官方 `h3-prompt-writing` 规格提炼的结构事实，每条标注来源小节。
- `corrections.md` —— 本库与官方原件的逐条差异与改法。

官方原件（MiniMax-H3 仓库的 skill 文件）**未附带 LICENSE，无明确再分发许可**，故不随包分发。

自行拉取最新原件进行核对：

```bash
bash scripts/update.sh --intel-only
```

原件会落在 `library/intel/snapshots/<时间戳>/`，并生成变化报告 `library/intel/CHANGES-<时间戳>.md`。
