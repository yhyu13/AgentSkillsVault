---
name: three-pbr-workflow
description: >-
  Token-friendly Three.js PBR high-fidelity workflow framework for AI agents.
  Lets an agent scaffold a runnable, GPU-tuned, tweakable Three.js PBR scene
  in ~5 minutes. Triggers on "3D 渲染", "PBR 材质", "高端画质", "Three.js
  场景", "HDR 环境光", "实时反射", "材质展示台", and similar requests. Skips
  Three.js basics; goes straight to runnable templates (single-file HTML +
  CDN imports, no npm). Inspired by GGEZ-style vibe-coding: single-file
  first, runtime first, token-minimal. 4 annotated `// 👈 CONFIG` blocks let
  the agent iterate on 90% of user requirements by editing small regions
  instead of regenerating the whole file.
license: Complete terms in LICENSE.txt
metadata:
  category: game-dev
  source:
    repository: 'https://github.com/vibe-stack/ggez'
    path: packages/three-runtime
    license_path: LICENSE.txt
---

# Three.js PBR Workflow (vibe-game 风格)

# Three.js PBR Workflow (vibe-game 风格)

## 触发条件(Trigger)

用户在以下场景使用本 skill:
- "做一个 Three.js 高端画质渲染器"
- "搭一个 PBR 材质展示场景"
- "Three.js + HDR + 反射 + Bloom"
- "3js 高端画面" / "3D 高清渲染"
- "材质实验室" / "材质球展示"
- "汽车/珠宝/产品 3D 展示页"
- 任何需要在浏览器跑、能调参、效果好的 3D PBR 场景需求

## 不适用

- React/Three Fiber 项目(用 R3F skill)
- 游戏逻辑 / 物理 / 碰撞(GGEZ 主框架去做)
- 模型建模、动画编辑(GGEZ 编辑器层)
- 后端 / 多人协作(完全无关)

## 核心原则(Agent 必须遵守)

1. **单 HTML 文件优先**:能放一个 `index.html` 解决,绝不分多文件。
   - CDN 引入 Three.js + addons,不需要 npm install
   - 用户双击或挂个静态服务器就能跑
2. **Token 友好**:模板里的"关键参数块"用清晰注释标出,agent 后续只需要改这些块,不需要重写整个文件。
3. **默认就是高端画质**:不要让用户从低画质开始调,直接用：
   - `ACESFilmicToneMapping` + `SRGBColorSpace`
   - `PMREMGenerator` + HDR
   - `PCFSoftShadowMap` + 区域光近似
   - `EffectComposer` + `UnrealBloomPass` + `OutputPass`
   - `lil-gui` 实时调参
4. **资产全用 CC0 / 公共 CDN**:不依赖用户本地文件,默认从 `https://cdn.jsdelivr.net` 拉。
5. **OrbitControls 默认开启**:用户第一眼就能转,不需要写交互代码。

## 工作流(Agent 必读)

### 步骤 1:确认场景类型(只问 1-2 个关键问题)

不要超过 2 个问题。从下面挑最重要的:

- **场景类型**(影响默认材质和构图):
  - (A) 材质球展示台(默认,最稳妥,效果炸)
  - (B) 单一产品(车/手机/鞋) + 旋转展台
  - (C) 建筑 / 室内
  - (D) 角色 / 道具(需要 glTF 模型)
- **资产来源**:
  - 默认走 CDN(快,token 少)
  - 用户提供本地文件 → 用相对路径
  - 用 AI 生成(GLB URL,如 Meshy 链接)

### 步骤 2:从 `templates/` 选一个最接近的

- `template-showcase.html` - 材质球展示台(6 个不同材质)
- `template-product.html` - 单产品展台
- `template-scene.html` - 建筑/室内
- `template-gltf.html` - 加载 glTF/GLB 模型
- `template-blank.html` - 空白场景,自己堆

### 步骤 3:用 `scripts/build.sh` 验证

```bash
bash scripts/build.sh <template-name> # 输出 dist/index.html,自动用 python -m http.server 启动
```

### 步骤 4:把 dist 部署到公网

```bash
# 用 site_deploy 工具,把 dist/ 部署出去
# 给用户一个公开链接
```

## 关键技术选型(不要改)

| 组件 | 选择 | 备注 |
|---|---|---|
| Three.js | r170+ via jsdelivr CDN | 用 ESM `importmap` |
| 后处理 | `EffectComposer` + `UnrealBloomPass` + `OutputPass` | **不用 SSAO/GTAO 默认**(移动端卡) |
| 阴影 | `PCFSoftShadowMap`,4096 贴图 | 单光源就够 |
| 调色 | `ACESFilmicToneMapping`,`outputColorSpace = SRGBColorSpace` | **硬性要求** |
| 抗锯齿 | 渲染器 `antialias: true` + `setPixelRatio(min(2, dpr))` | 不上 SMAA(成本高) |
| GUI | `lil-gui` via CDN | 4KB,比 dat.gui 轻 |
| 控制器 | `OrbitControls` | damping 0.05 |
| 加载器 | `GLTFLoader` + `DRACOLoader`(gltf 用) | 仅用时引入 |
| HDR | `RGBELoader` + `PMREMGenerator` | Poly Haven CC0 HDR |

## 默认资产(已 token 化,直接用)

见 `assets/manifest.md`。所有 URL 都验证过可访问,不需要 agent 再去搜。

## 关键参数块(Agent 主要改这里)

模板里有 4 个清晰标注的 `// 👈 CONFIG` 块:

1. **SCENE CONFIG** - 场景类型、布局、灯光位置
2. **MATERIALS CONFIG** - 材质参数(metalness/roughness/color)
3. **POST CONFIG** - Bloom 强度、曝光
4. **CAMERA CONFIG** - 相机位置、FOV

只改这 4 个块,就能 90% 满足用户需求。

## Token 节省策略(给 Agent 看的)

- **不要**每次重新解释 PMREMGenerator、ACES tone mapping 是什么
- **不要**在回复里贴整段模板代码,告诉用户"看 templates/xxx.html"
- **要**用 diff 风格的修改:`把 SCENE CONFIG 里的 layout 改为 "grid-3x2"`
- **要**用问句确认而不是猜:`想要更冷的色调,还是更暖的?`

## 部署清单(交付前)

- [ ] 在本地 `python -m http.server 8080` 跑通
- [ ] 确认 HDR 加载成功(看 console)
- [ ] 确认 OrbitControls 能转
- [ ] 确认 lil-gui 面板能拖
- [ ] 用 `website_deploy` 部署
- [ ] 把链接发给用户,用 `<deliver-assets>` 包装

## 常见报错(快速排查)

| 报错 | 原因 | 修复 |
|---|---|---|
| HDR 黑屏 | 路径错或 CORS | 用 `https://dl.polyhaven.org/file.php?id=...` |
| Bloom 没效果 | threshold 太高 | 默认 0.85,降低到 0.3 试 |
| 模型白色 | envMap 没设 | 走 PMREMGenerator 流程 |
| 卡顿 | DPR 太高 | `setPixelRatio(min(2, devicePixelRatio))` |
| 透明背景失效 | 用 UnrealBloomPass 必黑底 | 接受黑底或换方案 |

## 反例(不要这样做)

- ❌ 写一个 2000 行的 React + R3F 项目
- ❌ 用 npm + Vite + 配置文件 + 一堆依赖
- ❌ 不用 HDR,只用 `AmbientLight` 凑合
- ❌ 写 `MeshStandardMaterial` 当 PBR(用 `MeshPhysicalMaterial`)
- ❌ 让用户自己去 Poly Haven 下 HDR(直接 CDN 引用)

## 关联

- 上层: GGEZ 框架(`vibe-stack/ggez`),本 skill 是 GGEZ 的"快速原型"极简分支
- 平级: 任何 Three.js skill
- 下层: Three.js 官方文档(本 skill 不重复基础概念)
