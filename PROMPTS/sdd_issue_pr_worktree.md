设置speckit和agent 单issue 多pr 多worktree 并行工作流

add rule in agents md that when merge pr need first check current main line (including unstaged files) conflicts and make sure no conflict before merge
如果agent开始新工作，默认用main分支，如果当前checkout不是main分支同时user没有指明branch或worktree，那么要立即停下提醒user
另外不要自己关issue除非获得user许可，agent要更多的update issue，同issue可以开多个pr