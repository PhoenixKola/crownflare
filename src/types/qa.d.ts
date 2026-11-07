import type { ChamberSnapshot } from '../game/scenes/ChamberScene';
declare global { interface Window { __CROWNFLARE_QA__?: { snapshot: () => { screen: 'title' | 'playing' | 'paused'; player: ChamberSnapshot | null } } } }
export {};
