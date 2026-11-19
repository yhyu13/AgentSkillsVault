# 一次可复现的示范运行

本页两部分：**A** 用随包样本跑出来、任何人都能重跑；**B** 是内部真实运行的定性观察，记录本身未随包
分发，数字只作复述。

## A. 用随包样本复现

样本 `examples/sample-sessions.jsonl`：两个会话，一个失败、一个顺利。

```bash
python3 scripts/prepare_run.py --sessions examples --skills "repo=." \
  --out .demo --now 2026-11-18T00:00:00Z
# scanned=2 sampled=2 skills=1 rejected=0
```

接着**由模型**写 `$DEMO/scores.json`（形状照 `templates/scores.json`，脚本不生成它）；本次写的是：

```json
{"sessions": [
 {"session_id": "2026-11-16T09-12-ab12", "skills_used": ["skill-doctor"],
  "efficiency": {"label": "mostly_efficient", "reason": "只改了一处就交付，没有无谓的重复读取"},
  "code_quality": {"label": "mostly_inefficient", "reason": "改动了用户明确说不要动的祖传模块"},
  "procedure_compliance": {"label": "mostly_inefficient", "reason": "测试失败后仍宣布修复完成"},
  "verbosity": {"label": "mostly_efficient", "reason": "一句话交付，没有复述过程"}},
 {"session_id": "2026-11-12T14-05-77cd", "skills_used": [],
  "efficiency": {"label": "highly_efficient", "reason": "先读约定再改，顺序直接无返工"},
  "code_quality": {"label": "mostly_efficient", "reason": "改动最小，边界处理少一个"},
  "procedure_compliance": {"label": "highly_efficient", "reason": "跑过目标测试才交付"},
  "verbosity": {"label": "highly_efficient", "reason": "只给结论与验证结果"}}]}
```

```bash
python3 scripts/rubric_score.py --scores .demo/scores.json \
  --inventory .demo/inventory.json --out .demo
```

`$DEMO/scorecard.md` 节选（脚本输出英文，这里照抄主要部分再给中文对照）：

```
Grade: B (0.825)

| dimension | raw mean | curved | weight |
| efficiency | 0.900 | 0.950 | 0.25 |
| code_quality | 0.600 | 0.800 | 0.25 |
| procedure_compliance | 0.700 | 0.850 | 0.20 |
| verbosity | 0.900 | 0.950 | 0.15 |
| skill_coverage | - | 0.500 | 0.15 |
| **overall** | - | **0.825** | 1.00 |

Failed conversations: 2026-11-16T09-12-ab12
```

中文对照：效率 0.900 / 代码质量 0.600 / 流程遵循 0.700 / 简洁 0.900 / 覆盖率 0.500，总分 0.825。

`failed_conversations`: `2026-11-16T09-12-ab12`（代码质量与流程遵循低于 0.5 的原始分）。

### 由这次失败起草的改动

两处改动：升版本号，以及在原句后补一条可执行的交付规则（不新起一段）。

```diff
-version: "2026.11.18"
+version: "2026.11.18.1"
- **替换而不是追加**：已有的段落说错了就改它，不要在文件末尾再堆一段同义提醒。
+ **替换而不是追加**：已有的段落说错了就改它，不要在文件末尾再堆一段同义提醒。交付前先跑本次改动涉及的目标测试，没跑过就不说完成。
```

机械闸实测输出（节选：省略了 `human_still_required` 三问，退出 0）：

```json
{"gate": "PASS",
 "policy": {"max_lines": 30, "max_ratio": 0.2, "quote_cap": 400, "description_min": 80},
 "name": "skill-doctor",
 "changed_lines": {"added": 2, "removed": 2, "total": 4},
 "evidence_entries": 1,
 "links_checked": {"count": 12, "base": "."},
 "failures": [], "warnings": []}
```

命令里带了 `--transcripts "$DEMO/transcripts"`：任何中文 8 字以上的转写片段被抄进正文都会退出 1。

同一条改动如果把会话原句「你没跑测试就说完成了」抄进正文，闸门退出 1 并提示
`the transcript quote is pasted into SKILL.md; paraphrase it`。两条都在 `scripts/selftest.py` 里。

### 这份示范不能证明什么

- 两个会话只够演示流程，不能支持等级、趋势或对比结论。
- 真正合并还需要人审与回归；示范只到「可提交」。
- 覆盖率 0.5 来自样本里恰好一半会话用到 Skill，不代表真实覆盖率。

## B. 内部真实运行的定性观察

一轮 45 天、12 个会话、9 份已装 Skill 的运行（**运行记录未随包分发**，下面计数是从该记录复述的，
本包内无法复核）：

1. **没跑目标测试就宣布完成**出现在 4 个会话，是唯一同时跨两个维度的根因。
2. **改了用户当场说不要动的模块**出现 2 次：约束只在会话里，没有落到任何文件，因此不构成 Skill 缺口，
   记录为「应写进仓库规范」，不在 Skill 里加规则。
3. **同一段解释重复三次**出现在 5 个会话，但现行说明已经要求「先给结论」；按 `references/evidence.md`
   的判据，这属于模型没遵守而不是规则缺失，加同义提醒只会让文件变长。
4. 最终只留下 1 条改动，其余逐条写明不改的理由。

这一轮的教训写进了本 Skill 的边界：**零改动是合格结果**；**反馈入口要放在工作现场**；
**没有 harness 就不自动合并**。
