/** Let the loaded document paint before starting nonessential script work. */
export function afterPagePaint(callback: () => void) {
  let frame = 0;
  let cancelled = false;
  const start = () => {
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (!cancelled) callback();
      });
    });
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", start);
    cancelAnimationFrame(frame);
  };
}
