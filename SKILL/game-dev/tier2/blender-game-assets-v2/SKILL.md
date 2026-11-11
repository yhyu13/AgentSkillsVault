---
name: blender-game-assets-v2
description: 在 Blender 里制作、检查、修改游戏美术资产或搭建场景时使用。触发场景：资产进引擎前的多视角一致性/穿插/材质/规格检查；根据参考图从零建模或摆放组合现有资产搭场景；Geometry Nodes 程序化生成；交付前多视角渲染验证。不适用于：Unity/UE 工程里改代码或玩法（用 engine-project-agent-v2）、从零验证玩法可玩性（用 game-proto-validation-v2）。本 skill 是 blender-game-assets 的改进版，与原版并存，优先用本版。
metadata:
  category: game-dev
  version: 1.0.0
  origin: local (distilled from Kimi article)
  source:
    article: 'https://mp.weixin.qq.com/s/qSwHJXAuAyrjeYXGC3XnFA'
    published: '2026-11-02'
---

# blender-game-assets-v2 · Blender 游戏资产检查与搭建（可执行版）

方法不变：多视角渲染发现问题 → bpy 脚本修改（留记录、可复现）→ 重渲染验证。相对原版的差异：视角集合与渲染器定死、补上引擎侧真实坑、超预算有决策路径、附带可运行检查脚本。

## 一、资产检查（进引擎前）

**渲染证据固定五视图**：front / side / back / top / 45° 透视，EEVEE 快速渲染即可（检查用，不出宣传图）；拓扑另出一张 wireframe overlay。

逐项过：

- **多视角一致性**：比例与剪影对照参考图
- **穿插**：线框叠加先看交叠；可疑部件对用 3D Print Toolbox 的 Intersect 检查（或 bpy 包围盒相交粗查）；定位记录"部件名 + 视图"
- **材质与纹理**：接缝、UV 拉伸、隐藏文字/水印残留
- **规格**：跑 `scripts/bpy_checks.py`，统计 evaluated 三角面数、贴图尺寸、未 Apply Scale 的对象、命名不规范对象

**引擎侧真实坑（原版缺失）**：

- 单位约定 1 unit = 1 m；导出前 Apply Scale，否则 FBX 进 Unity/UE 缩放错乱
- Blender 视口按 quad 显示，引擎按 tri 计数——面数以脚本统计为准，不以视口为准
- 命名与组织：`SM_`（静态网格）/ `SK_`（骨骼）/ `T_`（贴图）前缀，按类别分 Collection；动画资产记录帧率与时长

## 二、超预算处置路径（原版缺失）

超面数不是"改小就行"，按序决策：

1. 删除不可见面（内部结构、永远朝下的底面）
2. 非视觉关键区域 Decimate + 重烘焙法线
3. 出 LOD（远距离换低模）
4. 仍超 → 退回美术重拓扑；Agent 不硬压到破坏剪影

## 三、场景搭建

顺序不能反：整体 blockout（布局与尺度）→ 五视图预览给需求方确认大关系 → 分构件细化（复杂建筑拆构件分步，不一口气建整体）→ 重复元素（柱廊/植被/栅栏）用 Geometry Nodes + 随机化去机械感。

过程中细化与检查交替进行；**首版交付质量取决于中途修了几轮，不是最后检查一次**。没有参考图/制作要求时先要输入，不自行发明风格。

## 四、交付

- 可继续编辑的 .blend 工程（命名清晰、Collection 分组合理）
- 五视图渲染预览 + 脚本统计的规格数据（tri / 贴图尺寸 / 动画帧率时长）
- bpy 修改记录（改了什么、为什么），供美术同事接手
- 视频类交付注明分辨率/帧率/时长，用 FFmpeg 出真实文件，不用截图拼凑

## 边界

不替代美术终审；风格与品质判断留给美术。Unity/UE 工程内改代码或玩法 → engine-project-agent-v2。

## 相对原版（blender-game-assets）的改进

"多视角"定死为五视图并指定 EEVEE；穿插检测给出具体工具（3D Print Toolbox / 包围盒粗查）；新增单位/Apply Scale/quad-tri 差异/命名前缀等引擎侧坑；新增超预算四步决策（含"退回美术"出口）；新增可运行的 `scripts/bpy_checks.py`；删掉"多模态判断空间关系"类口号。
