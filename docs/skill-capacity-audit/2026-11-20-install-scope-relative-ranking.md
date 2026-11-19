# 2026-11-20 安装闸门：从「前 2 档」改成「分类内相对排名 + 证据」

## 为什么要改

2026-11-13 定的规则是「每分类取前 2 个 band 安装」。band 是 `tier<N>` 目录，来自
`docs/skill-capacity-audit/score_skills.py` 的**容量分**。那条规则有两个后果，都不是它想要的。

**后果一：纯文档 skill 被结构性地压在 7.5。**

容量分的十项里，有三项对一个「只写方法、不带脚本」的 skill 是拿不到的：

| 项 | 满分 | 拿不到的原因 |
|---|---|---|
| `C_payload` | 2.0 | 需要 `references/` `scripts/` `templates/` 这类目录，纯文档没有 |
| `E_hygiene` 的脚本项 | 0.5 | 需要 ≥1 个真实脚本（≥120 字节） |

天花板 = `A 3.0 + B 2.0 + C 0 + D 2.0 + E 0.5 = 7.5` → 最好也就是 tier2。
全仓 312 个 curated skill 里，**99 个落在 7.5 及以下**，**242 个没有 `scripts/`**。
这解释了 `contradiction-analysis`（6.25）、`meeting-summary`（6.3）、`weekly-report`（6.8）
为什么全是 tier3：不是写得差，是它们不带脚本。

**后果二：保留率按分类乱跳。**

「前 2 档」在不同分类留下的比例差 10 倍：

| category | 旧规则保留 | 保留率 |
|---|---|---|
| management | 51/54 | 94% |
| content | 12/24 | 50% |
| video | 12/44 | 27% |
| **game-dev** | **4/37** | **11%** |
| **software-development** | **4/41** | **10%** |

40 个 behavioral PASS 的 skill 里，`arming-thought`/`contradiction-analysis`/
`weekly-report`/`project-update` 等 10 个就在被砍的那一侧——它们有真机触发通过的证据，
而那条规则不看证据。

## 改成了什么

1. **`scripts/install_scores.py`（新）** 给每个 skill 算一个 `select` 分：

   ```
   select = 容量分
            + 1.0   behavioral = PASS      （真机触发通过，直接证据）
            − 1.0   behavioral = ABSTAIN   （该触发没触发）
            − 1.0   behavioral = WRONG     （不该触发却触发了，和 ABSTAIN 同等有害）
            + clamp(quality − 8.0, −1, +1) （有质量评审时，最多 ±1）
            TIMEOUT 不动分：没拿到证据，不是证据为负
   ```

   容量分仍是底数，因为它是唯一覆盖全部 312 个 skill 的信号；behavioral 覆盖 68 个、
  质量台账覆盖 34 个。有证据的才加权，没证据的不假装有。

2. **`build-manifest.ps1` 的过滤段** 改成分类内排名：

   ```
   每分类按 select 降序取 ceil(N × keepSharePerCategory) 条
   ∪ behavioral PASS                     （证据优先，不受配额影响）
   ∪ select ≥ keepMinScore               （分数够高就不因分类拥挤被挤掉）
   且不把任何分类砍到 minKeepPerCategory 以下
   ```

   `topBandsPerCategory` 保留为 legacy 分支，只有 `keepSharePerCategory` 缺省时才走它。

3. **`skills_lock.py` 记录子模块 gitlink**（顺手修的相关缺陷）：原来它 hash 磁盘内容，
   而 CI 不带 `submodules: recursive`，所以 vendor 在 CI 上是空目录 → 本机生成的 lock
   在 CI 必挂，只能手工把 hash 抹空，等于把 70+ 个 vendored skill 移出校验范围。现在
   子模块记录 `gitlink:<sha>`，本机与 CI 一致，子模块升级仍然算变更。

## 新旧对照（本仓库实测）

| category | skill 数 | 旧规则（前 2 档） | 新规则（0.5 + 8.0 地板） | 保留率 |
|---|---|---|---|---|
| agents | 7 | 6/7 | **5** | 71% |
| content | 24 | 12/24 | **12** | 50% |
| design | 27 | 16/25 | **16** | 59% |
| devops | 17 | 14/16 | **9** | 53% |
| game-dev | 61 | 4/37 | **31** | 51% |
| knowledge-vault | 4 | 3/3 | **3** | 75% |
| management | 55 | 51/54 | **28** | 51% |
| math | 1 | 1/1 | **1** | 100% |
| software-development | 50 | 4/41 | **25** | 50% |
| video | 51 | 12/44 | **26** | 51% |
| writing | 2 | 1/1 | **2** | 100% |
| **合计** | **299** | 124/253 | **158** | — |

保留率从 10%–94% 变成 50%–100%。安装总数 143 → 168（含 vendor / host 条目）。

## 用证据改了名的几个

| skill | 容量分 | 证据 | select | 结果 |
|---|---|---|---|---|
| `xiaoma-studio` | 8.5 | behavioral WRONG | 7.5 | **砍**（原来装，且过 8.0 地板就会被装进来） |
| `html-ppt` | 9.0 | quality 6.8（导出脚本写死 macOS Chrome） | 8.0 | 装（踩地板线） |
| `presentation-skill` | 8.5 | behavioral ABSTAIN | 7.5 | 砍 |
| `contradiction-analysis` | 6.25 | behavioral PASS | 7.25 | **装**（原来被 band 砍掉） |
| `weekly-report` | 6.8 | behavioral PASS | 7.8 | **装**（同上） |
| `process-friction-cut` | 6.0 | behavioral ABSTAIN | 5.0 | 砍 |

40 个 behavioral PASS 的 skill 现在**全部**装，一条不落（旧规则砍掉 10 条）。

## 还没解决的问题

- 行为证据只覆盖 68/311，质量评审 34/311。剩下 200+ 个 skill 仍然只靠容量分排序，
  也就是仍然受 7.5 天花板影响。要把闸门彻底换到「证据轴」，得先把覆盖率补上。
- `TIMEOUT` 现在等于没证据。那 3 条（`stageshow`、`html-ppt`、`skill-doctor`）应当重跑。
- `keepSharePerCategory = 0.5` 是个可调的政策值，不是测出来的最优点。改它只需改
  `scripts/install-scope.json` 再重跑 `build-manifest.ps1`。
