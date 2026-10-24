// ~14 s of a visitor: watch it play, hover the movement (it comes apart), point at the drum, the
// comb and the governor (each lights and the readout says what it does), leave (it folds home and plays).
export default async (r) => {
  await r.hold(70);
  const c = await r.box("ani-doodle canvas"), at = (fx, fy) => ({ x: c.x + c.width * fx, y: c.y + c.height * fy });
  await r.glide(at(0.5, 0.55), 26); await r.hold(70);
  await r.glide(at(0.5, 0.22), 22); await r.hold(46);
  await r.glide(at(0.3, 0.47), 22); await r.hold(46);
  await r.glide(at(0.82, 0.3), 22); await r.hold(46);
  await r.glide({ x: c.x - 120, y: c.y + c.height * 0.5 }, 24); await r.hold(80);
};
