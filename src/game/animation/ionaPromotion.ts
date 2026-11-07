export type IonaOwnerApproval = 'PENDING_OWNER_REVIEW' | 'OWNER_APPROVED';

/** Ordinary gameplay must not select candidate art until the owner has approved it explicitly. */
export type IonaPromotionConfig = {
  readonly readyToPromote: boolean;
  readonly ownerApproval: IonaOwnerApproval;
  readonly candidateManifest: string;
};

export const IONA_PROMOTION_CONFIG: IonaPromotionConfig = {
  readyToPromote: false,
  ownerApproval: 'PENDING_OWNER_REVIEW',
  candidateManifest: 'art-source/manifests/iona-b01d-candidate-v1.json',
};

export function canPromoteIona(config: IonaPromotionConfig): boolean {
  return config.readyToPromote && config.ownerApproval === 'OWNER_APPROVED';
}
