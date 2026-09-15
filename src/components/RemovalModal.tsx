"use client";
import AccessibleDialog from "./AccessibleDialog";
import type { PublicInstaller } from "@/lib/public-installers";
export default function RemovalModal({
  isOpen,
  installer,
  onClose,
}: {
  isOpen: boolean;
  installer: PublicInstaller | null;
  onClose: () => void;
}) {
  return (
    <AccessibleDialog
      open={isOpen}
      onClose={onClose}
      title="Request a listing correction or removal"
    >
      <p className="mb-4">
        Tell us what needs correcting for {installer?.business_name}. Removal
        requests are reviewed before any listing changes.
      </p>
      <a
        className="btn-primary inline-block"
        href={"/claim?shop=" + encodeURIComponent(installer?.id || "")}
      >
        Request correction or removal
      </a>
    </AccessibleDialog>
  );
}
