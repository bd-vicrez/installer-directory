"use client";

import { useEffect, useRef, useState } from "react";

export default function DeferredMap({
  title,
  src,
  directionsUrl,
}: {
  title: string;
  src: string;
  directionsUrl: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    if (!("IntersectionObserver" in window)) {
      setNearby(true);
      return;
    }
    // Native iframe lazy loading can start far below the fold. Wait until the
    // map is actually nearby so its scripts do not compete with shop details.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearby(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={container} className="card overflow-hidden" style={{ height: 350 }}>
      {nearby ? (
        <iframe
          title={title}
          width="100%"
          height="350"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={src}
        />
      ) : (
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full items-center justify-center text-vicrez-red underline"
        >
          View map and directions
        </a>
      )}
    </div>
  );
}
