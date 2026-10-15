export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
export const ZOOM_RUBBER_MIN = 0.86;
export const ZOOM_DOUBLE = 2.5;

export type View = { scale: number; tx: number; ty: number };

export type Box = {
  width: number;
  height: number;
  left: number;
  top: number;
};

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** Keep the scaled image covering its own frame. Below 1×, pan is held so a pinch can rubber-band. */
export function clampView(
  view: View,
  width: number,
  height: number,
  minScale = ZOOM_MIN
): View {
  const scale = clamp(view.scale, minScale, ZOOM_MAX);
  const maxX = Math.max(0, (width * (scale - 1)) / 2);
  const maxY = Math.max(0, (height * (scale - 1)) / 2);
  return {
    scale,
    tx: clamp(view.tx, -maxX, maxX),
    ty: clamp(view.ty, -maxY, maxY),
  };
}

/**
 * Zoom toward a focal point measured from the unscaled image center.
 * `translate() scale()` with `transform-origin: center`.
 */
export function zoomAt(
  view: View,
  focalX: number,
  focalY: number,
  nextScale: number,
  width: number,
  height: number,
  minScale = ZOOM_MIN
): View {
  const scale = clamp(nextScale, minScale, ZOOM_MAX);
  const safe = view.scale || 1;
  const localX = (focalX - view.tx) / safe;
  const localY = (focalY - view.ty) / safe;
  return clampView(
    {
      scale,
      tx: focalX - localX * scale,
      ty: focalY - localY * scale,
    },
    width,
    height,
    minScale
  );
}
