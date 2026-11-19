# Asset Manifest · <标题>

每个素材都必须有 `source` 与 `status`。`status=skip` 的素材，对应页面必须在 `slide_plan.json` 里改成排版页，不允许留空图位。

| # | 用于页 | 素材 | 类型 | source | status | 落盘路径 / 备注 |
|---|---|---|---|---|---|---|
| 1 | 1 | 封面主视觉 | image | generate | generate | final/*/images/cover.png |
| 2 | 3 | 用户增长曲线 | chart | user | have | source 目录 growth.csv |
| 3 | 5 | 产品截图 | screenshot | user | skip | 未提供，改纯排版页 |
| 4 | 7 | 演示动效 | video | generate | generate | 见 video_slots.json slot-1 |

## 命名与路径约定

- 图片：`images/<页号>-<语义>.png`，全部相对路径。
- 视频：`videos/<slot>.mp4`，poster 为 `videos/<slot>-poster.png`。
- 字体：优先系统字体；必须内嵌时放 `assets/fonts/`。

## 缺口清单

- <缺什么，什么时候能补，补不上时的降级方案>
