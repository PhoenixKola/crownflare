import type { AnimationLabSnapshot, ArtReviewSnapshot, ChamberSnapshot, IonaPreviewSnapshot } from '../game/scenes/ChamberScene';
declare global { interface Window { __CROWNFLARE_QA__?: { snapshot: () => { screen: 'title' | 'playing' | 'paused' | 'review' | 'animationLab' | 'ionaPreview'; player: ChamberSnapshot | null; review: ArtReviewSnapshot | null; lab: AnimationLabSnapshot | null; preview: IonaPreviewSnapshot | null } } } }
export {};
