import legacySlugs from "./legacy-indexable.json";
import reviews from "./profile-reviews.json";
import { Installer } from "./types";
import { isVerified } from "./utils";

export type ProfileReview = (typeof reviews)[keyof typeof reviews];
const legacy = new Set(legacySlugs);
export const REVIEW_CANDIDATE_SLUGS = Object.keys(reviews);
export const INDEX_CANDIDATE_SLUGS = [
  ...new Set([...legacySlugs, ...REVIEW_CANDIDATE_SLUGS]),
];

export function reviewedProfile(shop: Installer): ProfileReview | null {
  const review = (reviews as Record<string, ProfileReview>)[shop.slug];
  if (!review || ["removed", "non_us_excluded"].includes(shop.status))
    return null;
  // A changed record must be reviewed again; an old brief must not attach to a new business.
  if (
    String(shop.id) !== review.id ||
    shop.business_name !== review.name ||
    shop.city !== review.city ||
    shop.state !== review.state ||
    JSON.stringify(shop.install_capabilities) !==
      JSON.stringify(review.expectedCapabilities) ||
    (shop.specialize_in || "") !== review.expectedSpecialty
  )
    return null;
  return review;
}

export function profileIndexing(shop: Installer): {
  index: boolean;
  basis: string;
} {
  if (["removed", "non_us_excluded"].includes(shop.status))
    return { index: false, basis: "withdrawn" };
  const hasReview = Object.prototype.hasOwnProperty.call(reviews, shop.slug);
  const review = reviewedProfile(shop);
  if (hasReview)
    return {
      index: review?.decision === "index",
      basis: review ? review.basis : "review-stale",
    };
  // Preserve the existing cohort during individual review. New source labels cannot grant admission.
  if (legacy.has(shop.slug) && isVerified(shop.source))
    return { index: true, basis: "legacy-pending-review" };
  return { index: false, basis: "needs-content-review" };
}
