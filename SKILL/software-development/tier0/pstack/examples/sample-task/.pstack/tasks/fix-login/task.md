# Task: Fix login redirect

- ID: fix-login
- Owner: @alice
- Risk tier: yellow
- Created: 2026-11-19
- Deadline or review point: 2026-11-20

## Goal
登录成功后跳转到用户原本要去的页面，而不是首页。

## Scope
- In scope: 登录回调重定向
- Out of scope: 登录表单样式

## Acceptance
- [x] 未登录访问 /settings 后登录，落在 /settings
- [x] 直接访问 /login 登录，落在首页

## Non-goals
- 不改第三方登录

## Constraints
- 不改会话存储

## Open questions
- 无
