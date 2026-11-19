# Result: Fix login redirect

## What changed
- 登录回调保留 returnTo 参数

## Evidence
- `evidence/test.log` — 登录测试输出，退出码 0

## Verification
- Command: npm test -- login
- Exit code: 0
- Observed: 所有登录测试通过

## Risks / Rollback
- Residual risk: 无
- Rollback steps: revert commit

## Status
done

## Follow-ups
- 无
