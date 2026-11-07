import type { ArtReviewSnapshot, ChamberSnapshot } from '../game/scenes/ChamberScene';
declare global { interface Window { __CROWNFLARE_QA__?: { snapshot: () => { screen: 'title' | 'playing' | 'paused' | 'review'; player: ChamberSnapshot | null; review: ArtReviewSnapshot | null } } } }
export {};
