# 质量评审口径（与容量分并列，不互相替代）

`score_skills.py` 量的是**包的形状**：frontmatter 齐不齐、正文多长、`references/` 在不在、链接断没断。它叫容量分（capacity），最高 10.00。它衡量不了一件事：这个 skill 读了之后**照着做能不能成**。

本库此前只有容量分。个人成长那边的 `agent-skill-vote` 账本已经跑了一套质量评审，这里把它接进来，两个数并排显示，不让 10.00 被读成「好」。

## 七个维度

只读 `SKILL.md` 与随包文件，不跑任务。每维 1–10，加权成总分。

| 维度 | 问的问题 |
|---|---|
| Contract | 触发条件、输入、产物写清楚了吗；描述会不会把不该进来的请求吸进来 |
| Executability | 照正文做能不能真跑起来：命令完整、脚本随包、路径不悬空 |
| Resistance | 出错时会不会静默走错：缺块、空输入、伪造引语、只检查账本不检查画面 |
| Recoverability | 中途失败能不能续：状态落在哪、重跑会不会重复付出 |
| Boundaries | 该停的地方停不停：要人确认的地方、不该自动合并的地方 |
| Honesty | 有没有把「承诺」写成「已验证」；没做到的说没说 |
| Cost of misuse | 用错时的代价：会不会覆盖文件、发出去、花掉钱 |

## 判据

- **HIGH**：加权 ≥ 8，且**没有任何一维低于 7**。单项低于 7 直接 NOT HIGH，不靠总分补。
- **9 分是执行线**：账本的口径是「9 分及以上才建议装并按原文执行」。不到 9 不等于不能用，等于「不要无条件照原文跑」。
- **只读评审不能抬高执行线**：文案评审最高只能说明「写得像那么回事」，不能证明它跑得通；要抬到执行线必须有真实任务实跑的证据。
- **同一份 skill 用新证据重评时，旧分进 `history`，不覆盖删除**。

## 记录格式

`import_quality_ledger.py` 把外部账本转成 `2026-11-18-quality-ledger.json`（文件名按导入日期，别复用旧名覆盖）：

```json
{"source": "...", "rubric": {...},
 "entries": [
   {"skill": "cook", "quality": 9.2, "verdict": "advanced",
    "reviewer": "...", "date": "2026-11-14", "note": "...",
    "origin": "votes.json#cook",
    "history": [{"quality": 5.0, "verdict": "...", "date": "...", "origin": "..."}]}]}
```

导入时有一条必须守的规矩：**账本里比对旧分时，取已经过了修复复核的那个数**。`votes.json` 对 `fable52-reproduction` 记的是 5.0（修复前的文档评审），README 记的是复核 8.0 HIGH；照 JSON 导就是把一个已经被推翻的数印在账本上。`import_quality_ledger.py` 里的 `SUPERSEDED` 就是这条，改它之前先读 README 那一行。

## 用法

```bash
# 1. 从外部账本生成质量台账
python docs/skill-capacity-audit/import_quality_ledger.py \
  --vote-dir "C:/Git-repo-my/个人成长/agent-skill-vote" \
  --out docs/skill-capacity-audit/2026-11-18-quality-ledger.json

# 2. 容量 + 行为 + 质量一起看
python docs/skill-capacity-audit/score_skills.py --root ~/.agents/skills \
  --behavioral docs/skill-capacity-audit/2026-11-18-trigger-merged.json \
  --quality   docs/skill-capacity-audit/2026-11-18-quality-ledger.json \
  --out /tmp/audit --date 2026-11-18
```

输出多两列：`quality`、`quality_verdict`；没评审过的留空，**不是 0**。`meta.quality` 会单列「容量 ≥9 但评审 <8」的清单——那批 skill 是分层最可疑的地方。

## 为什么两个数不能合成一个

容量分能机械重跑，质量分不能：它是一次有 reviewers、有日期、有具体缺陷的判断。合成一个加权数会让「上次谁看的、说了什么」消失，而这恰恰是复评时要用的东西。所以分列，冲突时以质量分为准去问「这条 skill 到底该不该在 tier0」。
