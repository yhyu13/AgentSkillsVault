# 交接记录

`scripts/check_ladder.py` 只读这份 JSON。缺字段按 0 或空字串处理，不替记录补成绩。

```json
{
  "current_rung": 1,
  "repeated_errors": [
    {"name": "错误的短名", "count": 2}
  ],
  "evidence_count": 0,
  "author": "写作者标识",
  "reviewer": "另一个审查者标识",
  "accepted_without_rewrite": 0,
  "clean_mornings": 0,
  "merge_requested": false,
  "done_definition": "可判断过或不过的一句话"
}
```

| 字段 | 含义 | 什么不算 |
|---|---|---|
| `current_rung` | 现在实际停的阶，1 到 4 | 希望到达的阶 |
| `repeated_errors` | 最近反复出现的错误和次数 | 只写一次的新错误 |
| `evidence_count` | 交件所附、可独立复核的证据数 | “我看过了” |
| `author` / `reviewer` | 两个互不包含的标识 | 同一标识换大小写、空格，或 `writer` 对 `writer-reviewer` 这种包含关系 |
| `accepted_without_rewrite` | 连续不需要重做就被接受的次数 | 改完才算通过的次数 |
| `clean_mornings` | 过夜后不需要收拾残局的早晨数 | 人半夜起来修过的次数 |
| `merge_requested` | 用户是否明确要求自动合并 | agent 自己推断 |
| `done_definition` | 过和不过都能判断的条件 | 更好、好看、优化一下、适当 |

模糊词表在脚本的 `VAGUE` 里。新增模糊词时同时给一条会失败的样例，否则检查没有变严。
