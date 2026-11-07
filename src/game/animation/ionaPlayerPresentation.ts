/** One reference scale and canvas foot pivot shared by every Iona movement pose. */
export const IONA_REFERENCE_CANVAS = { width: 128, height: 80, pivotX: 0.5, pivotY: 1 } as const;
export const IONA_REFERENCE_STANDING_HEIGHT = 60 as const;
export type IonaReviewSize = 48 | 60 | 72;

export interface IonaPresentationTarget {
  setOrigin(x: number, y: number): unknown;
  setScale(scale: number): unknown;
  setTexture(key: string): unknown;
  setPosition(x: number, y: number): unknown;
  setFlipX(flip: boolean): unknown;
  setAlpha(alpha: number): unknown;
}

export type IonaPresentationState = {
  /** Omit for frames advanced by Phaser's authored animation clips. */
  readonly textureKey?: string;
  readonly x: number;
  /** The physics body's ground/foot reference, not the pose's alpha bounds. */
  readonly footY: number;
  readonly airborneOffsetY?: number;
};

/**
 * Bridges the authoritative chamber state to the rendered Iona sprite.
 * The only scale changes come from a deliberate 48/60/72 review-size choice;
 * changing the animation texture never derives a new scale from alpha bounds.
 */
export class IonaPlayerPresentation {
  private target: IonaPresentationTarget | null = null;
  private reviewSize: IonaReviewSize = IONA_REFERENCE_STANDING_HEIGHT;
  private lastTextureKey = '';

  attach(target: IonaPresentationTarget): void {
    this.target = target;
    this.lastTextureKey = '';
    target.setOrigin(IONA_REFERENCE_CANVAS.pivotX, IONA_REFERENCE_CANVAS.pivotY);
    target.setScale(this.scale);
  }

  setReviewSize(size: IonaReviewSize): void {
    if (size !== 48 && size !== 60 && size !== 72) throw new Error(`Unsupported Iona review size: ${size}`);
    if (size === this.reviewSize) return;
    this.reviewSize = size;
    this.target?.setScale(this.scale);
  }

  get scale(): number {
    return this.reviewSize / IONA_REFERENCE_STANDING_HEIGHT;
  }

  get selectedReviewSize(): IonaReviewSize {
    return this.reviewSize;
  }

  present(state: IonaPresentationState): void {
    if (!this.target) return;
    if (state.textureKey && state.textureKey !== this.lastTextureKey) {
      this.target.setTexture(state.textureKey);
      this.lastTextureKey = state.textureKey;
    }
    this.target.setFlipX(false);
    this.target.setAlpha(1);
    this.target.setPosition(state.x, state.footY + (state.airborneOffsetY ?? 0));
  }
}
