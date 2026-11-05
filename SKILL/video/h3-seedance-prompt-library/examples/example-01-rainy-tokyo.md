# 示例 01 · 大白话 → 成品提示词

**用户原话**

> 一个人在下雨的东京街头跑过便利店门口，霓虹灯打在他身上，很孤独的感觉

---

## 翻译 Agent 做了什么

| 槽位 | 用户说了 | Agent 补的默认值 |
| --- | --- | --- |
| 主体 | 「一个人」 | 男性，约 30 岁；黑色短发、深炭灰风衣、深色长裤、白鞋 |
| 场景 | 「东京街头」「便利店」 | 商业街旁横巷；无品牌白底灯箱（避免 AI 生成乱码文字） |
| 天气/时间 | 「下雨」 | 夜晚，中等雨量，地面浅积水 |
| 运镜 | 未说 | 侧向跟拍（CAM-05），与主体同向约 3 米 |
| 景别 | 未说 | 中远景（主体拍大，孤立即刻消失） |
| 动作 | 「跑过」 | 起跑 → 加速踩水溅花 → 减速跑出画面（3 拍） |
| 色彩 | 未说 | 青蓝冷调为主，便利店暖白为唯一暖点 |
| 风格 | 未说 | 克制电影感 + 35mm 胶片颗粒（**不**上赛博朋克全特效） |
| 引擎/模式 | 未说 | H3 + Seedance 2.5 双份；文生视频 |
| 时长/画幅 | 未说 | H3 6s / Seedance 8s，单镜一镜到底；16:9 |

补的每一条都是**技术性默认值**，没有加任何用户没说的剧情。

---

## MiniMax H3

> 官方要求改写段用英文，所以 H3 版取库里的**英文片段**。对白原样保留在 `<d>` 内。

```text
integrated_multimodal_description

[Shot 1] Medium-long shot, a rainy night in a narrow side street off a Tokyo shopping block. On the left of frame, a convenience store with an unbranded white lightbox emits a cold white-green fluorescent glow, warm white light spilling from inside. The wet asphalt holds shallow puddles that stretch the green and magenta signage into long smeared reflections. A man around thirty years old with short black hair, wearing a dark charcoal lightweight trench coat, dark trousers and white sneakers, runs alone from the left of frame.

The camera tracks with him at a steady speed, holding about three meters, the subject remaining in the same place in frame while the background slides continuously to the left, the body level and unshakey, the focus locked on the subject, the focal length unchanged throughout.

First he drops his centre of gravity and starts running, arms pumping; then he accelerates past the doorway, his shoes striking the shallow puddle and throwing water outward from his ankles; then he slows slightly as he passes under the signboard, his shoulders rising and falling with his stride; finally he runs out of the right of frame, leaving only the rain, the puddles and the stretched neon reflections inside the frame, his eyes on the road ahead and his lips closed.

The convenience store's cold white-green signboard light falls on him from above and to the left, laying a saturated green rim light along his coat shoulder and the side of his face, the distant magenta neon tracing a faint magenta contour from behind right; the wet asphalt drags the sign and the neon into long coloured streaks that are broken up by the ripples on the water, the shadows still holding readable detail.

Restrained cinematic language: widescreen composition, soft natural skin, shallow depth of field blurring the background neon, no garish colour; overlaid with 35mm film grain, fine and even, sitting in the shadows and midtones, with soft highlight roll-off; the skin keeps pores, fine lines and a natural sheen.

Throughout, keep this man's age, hairstyle, facial proportions, the charcoal coat and the white sneakers exactly consistent, the coat and accessories neither gaining nor losing pieces, changing colour or deforming; keep the position and unbranded lightbox shape of the store front, the warm white interior light and the cold green sign light unchanged, the street architecture and layout unchanged, the horizon level and verticals straight; only this one person in frame throughout, with no passers-by, no crowd, no other figures in the glass or in the puddle reflections and no customers entering or leaving the store; no subtitles, title bars, watermarks, logos, interface buttons, border effects or graphic overlays anywhere in frame, and no legible brand names or lettering on the signboard; a single unbroken continuous shot with no cut, no insert, no jump cut and no dissolve, the camera position, height, angle and focal length unchanged apart from the specified lateral tracking, with no self-panning, rotation, shake, drift or zoom; his eyes always on the road ahead and never toward the camera; the running speed even throughout, with no sudden acceleration, sudden deceleration or freeze; no flicker, no judder, no dropped frames, tearing or macroblocking, with natural facial and body proportions and no rubbery deformation, and correct hand anatomy with exactly five fingers on each hand.

overall_soundscape

Dense rain striking the wet asphalt and the metal awning, the drip of rain on the awning and the air-conditioning unit close and distinct, distant tyre spray and one or two muffled thunder far down the street, broad spectrum with no sudden screech and no harsh high frequencies. Physical sound tied to each action: the contact of shoe soles on wet ground, the footfall rhythm quickening with the run, and a splash and fall of water with every step into the shallow puddles. The ambience and physical sounds sit at mid level as a spatial bed, with no dialogue and no voices.

non_diegetic_music

N/A
```

**为什么配乐写 N/A**：用户没提配乐，孤独感靠画面和环境音撑更干净。想加配乐就把这一段换成具体乐器编制与节奏（不要写抽象情绪词）。

---

## Seedance 2.5

> 中文片段对 Seedance 2.5 效果最好，直接取库里的中文片段。

```text
【主体】约 30 岁的男性，黑色短发，深炭灰轻薄风衣、深色长裤与白色运动鞋，位于画面右侧三分之一处，独自奔跑。
【环境】雨夜的东京商业街横巷，画面左侧是一家亮着灯的便利店，冷白偏青绿的无品牌荧光招牌，店内透出暖白光；湿沥青路面映出霓虹倒影。
【动作与时间】0~2 秒压低重心起跑、双臂前后摆动；2~5 秒加速跑过便利店门口，鞋底踩进浅积水溅起水花；5~8 秒略微减速、肩膀随步幅起伏，跑出画面右侧，只剩雨幕与地面倒影留在画框中。
【镜头与构图】中远景，摄影机以稳定侧向速度与主体保持约 3 米同向跟拍，主体在画面中的位置保持不变，背景持续向左掠过，机身水平不摇晃、始终对焦。
【光线与色彩】便利店的冷白偏青绿招牌光从画面上方偏左打在主体身上，肩线与侧脸带饱和青绿边缘光，远处品红霓虹勾出淡轮廓；湿沥青把招牌与霓虹拉成长条状彩色倒影并被涟漪打碎。整体青蓝冷调，店内暖白为唯一暖点，暗部保留可见细节，35mm 胶片颗粒。
【音频】密集雨点敲打湿沥青与金属雨棚，鞋底落地与踩水溅起声随脚步加密，远处轮胎溅水与一两声闷雷，无对白；低音大提琴长音加稀疏钢琴单音作铺底，音量最低。
【约束】保持人物外观、便利店门面与招牌、店内暖白光不变，地平线水平；画面中只有这一个人物，不出现字幕、水印、台标与多余标识；不闪烁、不切镜，除指定的侧向跟拍外镜头不自行运动，人物始终看向前方路面、不看向镜头。
```

---

## 自检与风险

- 时长 H3 6s / Seedance 8s，均在模型上限内；动作预算中偏高（跑 + 踩水 + 减速三拍 + 一次跟拍）。
- **最高风险：跟拍 + 奔跑最容易崩脸**。改法：换固定镜头（CAM-13 locked-off），人从画面左跑入、穿过便利店招牌下的光区、从右跑出——动作预算降到「低」，脸几乎不会崩，「人从光里穿过」的孤独感反而更强。
- **次风险：招牌乱码**。已写成「无品牌白底灯箱、不出现可辨识商标与文字」，还可再加「画面中不出现任何可读文字」。
