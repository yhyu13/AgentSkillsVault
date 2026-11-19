# Plan: Fix login redirect

## Playbook
Bug fix, references/upstream/skills/poteto-mode/playbooks/bug-fix.md

## Steps
- [x] 复现问题
- [x] 修重定向逻辑
- [x] 跑登录测试

## Verification
- Command: npm test -- login
- Expected result: 全部通过
- Evidence path: evidence/test.log

## Risks
- Risk: 重定向循环
- Mitigation: 加回归测试
- Rollback: revert commit

## Roles
- Driver: main
- Reviewer: @bob
- Verifier: @carol
