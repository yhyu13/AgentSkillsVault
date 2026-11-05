# NOTICE

## 本项目

H3 + Seedance 2.5 提示词库（`h3-seedance-prompt-library`）。

库内提示词片段、结构说明、脚本与文档为原创，采用 MIT 许可（见 `LICENSE`）。
MIT 许可覆盖本项目自有内容，不覆盖下文列出的第三方内容。

## 第三方内容与来源

本项目**引用**以下官方规格，以确保提示词结构准确：

| 来源 | 用途 | 许可状态 |
| --- | --- | --- |
| MiniMax 官方仓库 [`MiniMax-AI/MiniMax-H3`](https://github.com/MiniMax-AI/MiniMax-H3) 的 `skills/h3-prompt-writing/` | H3 三字段结构、Ref2VA 六段结构、参考标签语法、对白与运镜写法 | **该仓库未附带 LICENSE 文件**，无明确再分发许可 |
| 字节跳动火山引擎文档（Ark / 即梦） | Seedance 2.5 参数与接口 | 官方文档，仅作事实引用 |

因此：

- **官方原件不随本项目的公开发布包分发。** `library/intel/minimax-h3-official/` 下的原文副本仅保留在本地源码仓库中，供比对使用。
- 发布包内只保留**带出处的规格摘要** `library/intel/official-facts.md` 与**差异报告** `library/intel/corrections.md`，均逐条标注来自哪个官方文件的哪个小节。
- 任何人安装后，运行 `bash scripts/update.sh --intel-only` 即可从官方源自行拉取最新原件进行核对。

## 商标与模型

MiniMax、海螺（Hailuo）、Seedance、即梦、字节跳动、Volcano Engine 均为各自权利人的商标或产品名。本项目与之无隶属关系，仅作为目标模型的兼容性说明出现。

## 第三方教程参考

库的初版结构曾参考若干第三方提示词指南（如 minimaxh3.tv、seedance2-5.video 等）。这些内容已于 2026-10-27 全部对照官方原件校正，官方与第三方冲突处**一律以官方为准**。校正明细见 `library/intel/corrections.md`。
