# cindy-web-search 的偏好键（实测记录）

本文件记录 `cindy-web-search` 插件如何决定用哪个搜索源。内容来自 2026-11-14 读插件源码
（`main.js` 的 `readSearchPrefs` / `searchWeb`、`settings.js`）加一次线上实测，不是文档推测。

## 两个键

| 键 | 默认值 | 作用 |
|---|---|---|
| `cindyAiEnabled` | `true` | `true` = 未显式指定源时走 Cindy 托管搜索 |
| `byoDefaultProvider` | `brave` | `cindyAiEnabled=false` 时使用的自备源，可选 `brave` / `tavily` / `deepseek` |

默认值来自代码里的 `readSearchPrefs()`；缺键即视为默认。

## 优先级（`searchWeb` 的实际分支）

1. 调用时显式传了 `provider` → 用它（`cindy` 走托管，其余走 BYO）。
2. 传了非法值 → 直接返回 `providerUnsupported`，不会 fallback（只对调用参数 `args.provider` 成立）。
   kv 里写非法值则是另一回事：`isByoProvider()` 静默丢弃，回落默认 `brave`，不报错、不提示。
3. 没传 `provider` → 读偏好：
   - `cindyAiEnabled=true` → 托管搜索（`provider:"cindy"`）
   - `cindyAiEnabled=false` → 用 `byoDefaultProvider`

也就是说：只写 `byoDefaultProvider` 而不把 `cindyAiEnabled` 设为 `false`，搜索仍然走托管源。
这是最容易配错的一步。

## 文件位置

```
%APPDATA%/Cindy/owners/<owner>/ghost-kv/cindy-web-search.json
%APPDATA%/Cindy/safe-storage/owner_<owner>_ghost_secret_cindy-web-search_<key>_api_key.enc
```

- kv 文件是**普通 JSON**，插件通过宿主 `fetch('/kv')` 读它，改文件即等效于设置页保存。
- 设置页自己写回时的规则：值等于默认就删除该键，`cindyAiEnabled=false` 才写入。
- 密钥单独加密存放，不落在 kv 里；对应 `.enc` 存在才说明这个 provider 可用。
- kv 与插件代码目录分离，插件升级替换代码目录时偏好保留（推断，未实测）。

## 各源的限制

| 源 | 出口 | 限制 |
|---|---|---|
| cindy | 宿主管道 | 额度耗尽返回 `QUOTA_EXHAUSTED` |
| brave | `api.search.brave.com` | 需 `X-Subscription-Token` |
| tavily | `api.tavily.com` | 需 `Authorization: Bearer`；`fetch_page` 也用它 |
| deepseek | `api.deepseek.com` | 查询 ≤128 个 Unicode 字符；按成功请求计费；摘要优先 `summary` |

域名白名单写在插件 `ghost.json` 的 `network.hosts` 里，新增源必须先声明，否则请求会被宿主拦下。

## 不要做的事

- 不要为了省一次查询去改 `cindyAiEnabled`，它影响的是「默认走哪条路」，不是单次开关。
- 不要在失败后让插件自动换源：插件声明了不自动重试、不切换搜索源，换源是人的决定。
- 不要把这里的路径写死成某个 owner id，多账号机器上 owner 目录会不同。
