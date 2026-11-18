# 案例

- 失败输出：我看不见你的文件系统。
- 期望：列出当前目录。
- 步数上限：4
- 消息格式：ChatML
- 主缺口：请求里没有工具语法。外层能执行，模型看不见。

## 模型看见的片段

```text
im_start system
你是一个有用的助手。
im_end
im_start user
这个目录里有什么？
im_end
im_start assistant
```
