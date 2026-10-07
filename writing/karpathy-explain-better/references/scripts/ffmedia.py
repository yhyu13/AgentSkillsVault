#!/usr/bin/env python3
"""
ffmpeg 探测与调用的小工具集（不依赖 ffprobe）

为什么要单独一个文件：讲解视频流程里，时长必须来自**音频实测**，
所以需要一个「探测能力」的入口；很多环境（尤其 Windows）只装了 ffmpeg.exe，
不装 ffprobe.exe，因此一律用 `ffmpeg -i` 的 stderr 解析。

依赖：ffmpeg 在 PATH 中。
"""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

_DURATION_RE = re.compile(r"Duration: (\d+):(\d{2}):(\d{2}\.?\d*)")
_VIDEO_RE = re.compile(r"Stream #\d+:\d+.*?: Video: (\w+).*?, (\d+)x(\d+)")
_AUDIO_RE = re.compile(r"Stream #\d+:\d+.*?: Audio: (\w+)")


def require_ffmpeg() -> str:
    path = shutil.which("ffmpeg")
    if path is None:
        raise RuntimeError(
            "未找到 ffmpeg。请安装并加入 PATH。\n"
            "Windows 例：把 ffmpeg.exe 所在目录加入系统 PATH。"
        )
    return path


def _probe_text(path) -> str:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-f", "null", "-"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        errors="replace",
    )
    return result.stdout


def probe_duration(path) -> float | None:
    """媒体时长（秒）；文件不存在或解析失败返回 None"""
    path = Path(path)
    if not path.exists():
        return None
    match = _DURATION_RE.search(_probe_text(path))
    if not match:
        return None
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def probe_summary(path) -> dict:
    """{duration, video: {codec,width,height}, audio: {codec}}"""
    text = _probe_text(path)
    info: dict = {"duration": None, "video": None, "audio": None}
    match = _DURATION_RE.search(text)
    if match:
        hours, minutes, seconds = match.groups()
        info["duration"] = int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    match = _VIDEO_RE.search(text)
    if match:
        codec, width, height = match.groups()
        info["video"] = {"codec": codec, "width": int(width), "height": int(height)}
    match = _AUDIO_RE.search(text)
    if match:
        info["audio"] = {"codec": match.group(1)}
    return info


def run_ffmpeg(cmd: list[str], cwd=None) -> subprocess.CompletedProcess:
    """执行 ffmpeg；失败时把输出一起抛出来，便于定位"""
    result = subprocess.run(
        cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, errors="replace",
    )
    if result.returncode != 0:
        raise RuntimeError(
            "ffmpeg 执行失败（exit code {}）\n命令：{}\n输出：\n{}".format(
                result.returncode, " ".join(cmd), result.stdout[-4000:]
            )
        )
    return result
