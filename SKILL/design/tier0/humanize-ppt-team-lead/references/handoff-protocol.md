# 交接协议：怎么派活、怎么回传

## 1. 单次调度模板

每次调用成员都用同一结构，缺项视为无效调度。

```text
成员：<agent 文件名去扩展名>
必须读：agents/<成员>.md、skills/<绑定 skill>/SKILL.md、本阶段输入契约
输入：<文件路径，不要贴全文>
任务：<动词 + 唯一目标，一句话>
产出：<精确路径清单，一个文件一行>
验收：<可机器判定的条件，例如 validate_pack.py --stage contracts 退出码 0>
禁止：<该阶段不能做的事，来自成员角色卡的禁止项>
回传：已读输入 / 关键判断 / 产出路径 / 未完成项 / 需主理人决策的问题
```

## 2. 回传格式

成员回传一律五段，主理人不需要追问就能决定下一步：

```text
[已读] agents/outline-director.md, skills/humanize-ppt/SKILL.md, source.md
[判断] 受众是内部工程团队，前状态=不信任自动化，后状态=愿意试点一个流程
[产出] deck/brief/deck_brief.md, deck/plan/slide_plan.json（12 页）
[未完成] asset_manifest 里第 3、7 页的截图用户未提供
[需决策] 这两页是否降级为纯排版页？
```

禁止在回传里写"已完成，请查看"这种无法验收的话。

## 3. 信息流规则

- 渲染器只能读契约文件，不能读原始资料；需要补充信息时向主理人要，不要自己猜。
- 成员之间不直接对话。A 的结论要进 B 的输入，必须由主理人写进契约或 `run-log.md`。
- 主理人是唯一面向用户输出汇总的角色。成员不得直接给用户结论。
- 用户在中途改需求：先更新 `deck_brief.md`，再判断是否需要回退阶段，不要口头对齐就继续。

## 4. 单线程降级模式

宿主没有子 Agent 能力时，按下列顺序自己走一遍，每段结束时执行对应校验：

```bash
python scripts/new_deck_workspace.py --out deck --title "<标题>"
# 逐段填写 templates/ 里的契约 → 每次填完立刻校验
python scripts/validate_pack.py --deck deck --stage contracts
python scripts/validate_pack.py --deck deck --stage render
python scripts/validate_pack.py --deck deck --stage delivery
```

降级模式下要额外把每段的"关键判断"写进 `deck/brief/run-log.md`，让用户能看到结构是怎么定下来的，而不是只看到一个成品。

## 5. 冲突处理

| 冲突 | 处理 |
|---|---|
| 用户要求页数 > 12 但状态变化只有 4 个 | 先按状态变化定页数，把差额说清，让用户选"删页"或"加料" |
| 用户要风格 A，但契约里的素材只有风格 B 能承载 | 用契约说话，给两个可执行选项，不要硬渲 |
| 两路渲染结果差异大 | 各截一张首页给用户，让用户在两条路上选，不要替用户审美 |
| 成员报"skill 未加载" | 检查 `skills/<name>/SKILL.md` 是否存在；不存在就明说降级，不许假装 |
