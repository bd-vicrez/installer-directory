"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";

export default function AccessibleDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open || !dialog.current) return;
    const node = dialog.current;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    if (!node.open) node.showModal();
    document.body.style.overflow = "hidden";
    titleRef.current?.focus();
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      aria-labelledby={id}
      aria-modal="true"
      className="quote-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== dialog.current) return;
        const box = dialog.current.getBoundingClientRect();
        if (
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        )
          onClose();
      }}
    >
      <div className="p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2
            id={id}
            ref={titleRef}
            tabIndex={-1}
            className="text-xl font-bold text-gray-900 outline-none"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={
              title.toLowerCase().includes("quote") ||
              title.toLowerCase().includes("installation")
                ? "Close quote form"
                : "Close dialog"
            }
            className="shrink-0 rounded-lg border border-gray-300 w-11 h-11 text-gray-900 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
