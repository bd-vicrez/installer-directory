"use client";
import AccessibleDialog from "./AccessibleDialog";
export default function ClaimModal({
  isOpen,
  onClose,
  shop,
}: {
  isOpen: boolean;
  onClose: () => void;
  shop?: { id: string | number; business_name: string } | null;
}) {
  return (
    <AccessibleDialog
      open={isOpen}
      onClose={onClose}
      title="Claim or update your listing"
    >
      <div className="space-y-4">
        <p>
          {shop?.business_name ? (
            <>
              Request an ownership review or correction for{" "}
              <strong>{shop.business_name}</strong>.
            </>
          ) : (
            "Find your listing to request an ownership review."
          )}{" "}
          We will verify your relationship to the business before making
          changes.
        </p>
        <a
          className="btn-primary block text-center"
          href={shop ? "/claim?shop=" + encodeURIComponent(shop.id) : "/claim"}
        >
          Request listing review
        </a>
        <p className="text-sm">
          Wholesale membership is separate:{" "}
          <a className="underline" href="https://b2b.vicrez.com/">
            Explore the dealer program
          </a>
          .
        </p>
      </div>
    </AccessibleDialog>
  );
}
