# DELIVERY · <标题>

## 主交付

- 主入口：`final/<path>/index.html`
- 备选入口：`final/<path>/index.html`（风格不同，未选为主交付的原因：<...>）
- 资源目录：`final/<path>/images/`、`final/<path>/assets/`
- 打开方式：直接双击，或 `python -m http.server 8000` 后访问

## 契约文件

- `brief/deck_brief.md`、`brief/ast_outline.md`、`brief/speaker_intent.md`、`brief/asset_manifest.md`
- `plan/slide_plan.json`、`plan/video_slots.json`

## 演讲模式

- 入口：`presenter/index.html`
- 当前页/下一页：<快捷键>
- 逐字稿：每页 notes
- 计时器：<行为说明>

## 视频 / 动效

| slot | 状态 | 文件 | 降级说明 |
|---|---|---|---|
| slot-1 | rendered / poster-only / degraded | `videos/...` | <...> |

## 上线 / 导出

```bash
# 本地预览
python -m http.server 8000 --directory final/<path>

# 静态部署（把整个 final/<path>/ 目录一起上传，不要只传 index.html）
# PDF 导出
bash ../skills/frontend-slides/scripts/export-pdf.sh final/<path>/index.html out.pdf
```

## 已知限制

- <哪些页没有真实素材 / 哪些动效降级 / 哪些设备未验证>

## 质检结论

| 门 | 结论 | 说明 |
|---|---|---|
| G1 结构 | 通过 / 需修复 | |
| G2 人感 | | |
| G3 页面 | | |
| G4 演讲与视频 | | |
| G5 可复制 | | |

`validate_pack.py --stage delivery` 退出码：<0 / 非 0，若非 0 贴关键报错>
