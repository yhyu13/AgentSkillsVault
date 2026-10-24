# 可复用脚本：分步帧 → 时长规划 → 渲染 → 校验

四个文件，只用 `ffmpeg` + `Pillow` + `numpy`，不依赖项目结构。

| 文件 | 作用 |
| --- | --- |
| `ffmedia.py` | 用 ffmpeg 探测时长/流信息（**不用 ffprobe**）；统一的 ffmpeg 调用与报错 |
| `plan_timeline.py` | 把「每个场景的若干分步画面」变成「每段几帧、几秒」，并对齐整数帧 |
| `render_pipe.py` | 逐帧亚像素渲染（推镜 + 淡入淡出）→ raw RGB 管道 → ffmpeg 编码 |
| `verify_video.py` | 交付前校验三件套：时长对齐 / 画面命中 / 抖动量化 |

## 完整流程

```bash
# 1. 时长规划（时长以音频实测为准）
python plan_timeline.py --manifest frames/steps.json \
                        --frames-dir frames --audio-dir audio --out timeline.json

# 2. 渲染 + 编码
python render_pipe.py --timeline timeline.json --out out.mp4 --audio audio/narration_full.mp3

# 3. 校验（任何一项失败退出码非 0，不要跳过）
python verify_video.py --video out.mp4 --timeline timeline.json --audio audio/narration_full.mp3
```

## manifest 格式（`plan_timeline.py` 的输入）

```json
{
  "fps": 24,
  "scenes": [
    {
      "id": 0,
      "audio": "scene_00.mp3",
      "duration": 10,
      "files": ["scene_00_01.png", "scene_00_02.png"],
      "weights": [3, 2]
    }
  ]
}
```

- `audio` 省略时按 `scene_{id:02d}.mp3` 找；`--audio-dir` 不传则不查音频
- `duration` 是**备胎**，只在音频读不到时使用，并会打印 `[WARN]`
- `weights` 是同一场景内各分步画面的时长占比（可理解为该步新增内容的字数），
  省略则均分

## 时间轴格式（`timeline.json`）

```json
{
  "fps": 24,
  "frames_dir": "frames",
  "total_frames": 4267,
  "total_duration": 177.79,
  "segments": [
    {"image": "scene_00_01.png", "frames": 57, "duration": 2.375,
     "scene": 0, "step": 1, "scene_frames": 171, "frame_offset": 0,
     "scene_start": true, "scene_end": false}
  ]
}
```

`scene_frames` / `frame_offset` / `scene_start` / `scene_end` 是给渲染与转场用的：
推镜要在**场景内**连续（跨分步画面不重置），淡入淡出只打在每个场景的首尾。

## 校验的阈值怎么来的

`verify_video.py` 的抖动阈值（冻结帧 ≤ 5%、残差 RMS ≤ 0.02）是在「深色底 + 文字」
这类静态画面上标定的，实测：

| 渲染方式 | 冻结帧 | 逐帧 MAE 中位 | 抖动残差 RMS | 判定 |
| --- | --- | --- | --- | --- |
| 静帧（不推镜） | 100% | 0.000 | 0.000 | 通过（无运动即无抖动） |
| **逐帧亚像素渲染** | **0%** | **0.017** | **0.001** | **通过** |
| 滤镜 `zoompan` + 3x 预放大 | 0% | 0.065 | 0.031 | 失败 |
| 滤镜 `zoompan` 直接推 | 39% | 0.092 | 0.155 | 失败 |

画面本身带**故意运动**（动画、实拍）时这个指标没有意义，用 `--no-jitter` 跳过。
