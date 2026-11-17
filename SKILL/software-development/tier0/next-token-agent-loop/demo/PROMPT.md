### Minimal prompt

Use $next-token-agent-loop to explain why an agent says it cannot see the repository even though the harness can run shell commands.

### Recreate the demo

一个 agent 收到“这个目录里有什么”。它回答看不见文件系统。系统消息没有工具语法。外层其实能执行 bash 标签里的命令。按本 skill 标出缺口，改系统消息，并写出工具结果如何以 user 角色回到下一次请求。

### Remix prompt

把 bash 换成一个只读的 HTTP 查询工具。模型要回答“今天的日期”和“某个包的最新版本”。保留同样的停止、执行、追加和循环上限，不要改成聊天式建议。
