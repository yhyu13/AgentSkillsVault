import * as N from './news.jsx';
import {shots} from '../engine.js';
export const SHOT_VIEWS = {intro: N.IntroView, outro: N.OutroView, status: N.StatusView, agents: N.AgentsView, price: N.PriceView,
  math: N.MathView, rank: N.RankView, steps: N.StepsView, money: N.MoneyView, radar: N.RadarView};
export const SHOT_BUILDERS = Object.fromEntries(shots.map(s => [s.id, N.buildShot(s.id)]));
