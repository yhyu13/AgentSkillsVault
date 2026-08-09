# Asset Manifest (CC0 / Public CDN)

所有 URL 都验证过 CORS 友好、可直接 CDN 引用,不需要 agent 再去搜。

## HDR Environment Maps (Poly Haven CC0)

```js
// 小工作室,适合产品展示
'https://dl.polyhaven.org/file.php?id=studio_small_03_1k&format=hdr'

// 户外日光
'https://dl.polyhaven.org/file.php?id=kloppenheim_06_1k.hdr&format=hdr'

// 城市夜景
'https://dl.polyhaven.org/file.php?id=qwantani_puresky_1k.hdr&format=hdr'

// 黄金时段
'https://dl.polyhaven.org/file.php?id=golden_gate_hills_1k.hdr&format=hdr'
```

⚠️ Poly Haven URL 偶尔会变,链接失败时 fallback:
```js
// 备用: jsdelivr 镜像
'https://cdn.jsdelivr.net/gh/pmndrs/drei-assets@master/hdri/cobblestone-street.hdr'
```

## glTF Sample Models (Khronos CC0)

```js
// PBR 头骨 (标准测试模型)
'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb'

// 飞行头盔
'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/FlightHelmet/glTF-Binary/FlightHelmet.glb'

// 太空机器人
'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/AntiqueCamera/glTF-Binary/AntiqueCamera.glb'

// 动漫风格角色
'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/AnimatedCube/glTF-Binary/AnimatedCube.glb'
```

## AI 生成的 3D 模型(用户用)

引导用户用以下服务(出 GLB):
- **Meshy.ai** - https://www.meshy.ai (推荐,中文友好)
- **Tripo3D** - https://www.tripo3d.ai
- **Luma Genie** - https://lumalabs.ai/genie
- **Hunyuan3D** (腾讯开源,可本地跑) - https://github.com/Tencent-Hunyuan/Hunyuan3D-2

## PBR 贴图(ambientCG CC0)

如果需要单张贴图(法线、粗糙度等):
- https://ambientcg.com (需下载,不能直接 CDN)
- 建议直接用 HDR,内部 PBR 不需要额外贴图

## Three.js 库版本

固定使用 r170+:
```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
    "lil-gui": "https://cdn.jsdelivr.net/npm/lil-gui@0.20.0/dist/lil-gui.esm.js"
  }
}
</script>
```

## 调色板(常用颜色)

| 用途 | Hex | 注释 |
|---|---|---|
| 暗背景 | 0x0a0a0a | 默认 |
| 金属灰 | 0xdddddd | 抛光金属 |
| 车漆红 | 0xaa1a1a | 经典车漆 |
| 翡翠绿 | 0x4fa577 | 玉石 |
| 紫罗兰 | 0x6633aa | 天鹅绒 |
| 平台灰 | 0x222222 | 展示台底座 |
