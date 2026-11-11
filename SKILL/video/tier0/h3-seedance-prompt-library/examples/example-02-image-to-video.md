# 示例 02 · 图生视频（Seedance 2.5 运动优先公式）

**用户原话**

> 我有一张产品图，白色保温杯放在大理石台面上，想让它转个圈，背景是干净的摄影棚

---

## 先出参考图（图生视频的前置步骤）

用 `image-model.md` 的 IMG 片段先做关键帧，再喂给视频模型。

```text
产品三视图：一只哑光白色不锈钢保温杯，直筒细身，高约 24 厘米，杯盖为同材质旋盖，
杯身中部无任何文字与 logo，杯壁均匀无反光斑；置于浅灰大理石台面中央，
纯白无缝摄影棚背景，柔和顶光加两侧补光，物体接地阴影自然，构图居中，
画面比例 3:4，背景纯白不出现任何文字与标识。
```

要点：给视频模型用的参考图要**信息少而准**——锁住产品几何和材质，不要塞满细节；明确写出画幅比例以免裁切错位。

---

## Seedance 2.5 图生视频提示词

用运动优先公式：**保持 → 主运动 → 镜头 → 次运动 → 时间节奏 → 落幅画面 → 约束**

```text
保持：严格保持 @Image1 中保温杯的杯身直径比例、杯盖旋钮数量、哑光白色材质
与杯身中部无文字无 logo 的特征不变；保持浅灰大理石台面的纹理与纯白无缝背景不变。

主运动：保温杯在台面上顺时针缓慢旋转一整圈，杯身自转约 360 度，速度均匀。

镜头：固定机位（locked-off），与台面同高，略低于杯身中线的中近景，全程无位移。

次运动：台面上有一层极薄的雾气缓慢飘过杯子底部；杯身表面的高光随转动缓慢滑移。

时间节奏：0~3 秒起转，3~6 秒匀速转完，6~8 秒减速停稳。

落幅画面：杯子停在初始朝向偏约 20 度的位置，静止不动。

约束：不改变杯子的形状、比例、颜色与配件数量；不出现任何文字、logo、贴纸或标签；
不出现手或人物；不出现多余物体；不切镜；除主运动外相机不自行运动；
不出现闪烁、形变或穿模；台面与背景不产生纹理游动。
```

**为什么这么写**：

- 图生视频最容易崩的是**产品几何**——所以第一句就逐项点名保持什么，而不是笼统写「保持一致」。
- `锁定机位 + 单动作` 是产品图生视频的最稳组合：环绕、推拉这些额外运动会把产品几何搅变形。
- 约束段显式排除手与人物，否则产品镜头很容易冒出多余的手。

---

## MiniMax H3 图生视频（I2VA）

H3 用的是**官方固定对齐指令句**，不是 `@Image1`：

```text
For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

[Shot 1] Close-medium shot of a matte white stainless steel tumbler standing at the centre of a light grey marble counter, framed slightly below the middle of the cup against a seamless pure white studio backdrop. The tumbler is about twenty-four centimetres tall with a slim straight body and a matching screw cap, its surface carrying no text and no logo, lit by a soft overhead key with gentle fill from both sides and a natural contact shadow beneath.

The camera remains locked off at counter height for the entire shot, with no movement.

First the tumbler begins a slow clockwise rotation on the counter through a full three hundred and sixty degrees at an even speed; then a faint low mist drifts past the base of the cup while the highlight travels slowly across the matte surface; finally the tumbler decelerates and comes to rest about twenty degrees from its starting orientation, motionless, the frame holding on the finished product.

Throughout, keep the tumbler's body diameter ratio, the number of cap ridges, the matte white material and the absence of any text or logo on the body exactly consistent, and keep the marble texture and the pure white seamless background unchanged; only the one tumbler in frame, with no hands, no people, no extra objects, no text, no logos, no stickers and no labels; a single unbroken shot with no cut; no camera movement other than the specified subject rotation; no flicker, no deformation, no warping and no surface swimming on the counter or the backdrop.

overall_soundscape

A quiet studio room tone with a faint low hum from the lighting rig, and a soft continuous metallic whir rising and falling with the rotation of the tumbler on the marble surface.

non_diegetic_music

N/A
```

**关键点**：H3 的参考标签是 `<Picture 1>`，且**第一行必须是官方固定的对齐指令句**，后面空一行再写三字段。写成 `@Image1` 是 Seedance 的语法，H3 不认。

---

## 自检与风险

- 动作预算「低」——产品自转 + 一次固定机位，最稳的组合。
- 时长 Seedance 8s / H3 6s，均在上限内。
- 风险：旋转超过一整圈时杯盖旋钮容易数量漂移。若翻车，把主运动改成「旋转约 120 度后停稳」，幅度更小更稳。
