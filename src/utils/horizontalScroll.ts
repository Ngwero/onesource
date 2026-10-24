/** Native touch/trackpad scrolling, plus mouse dragging and Shift+wheel. */
export function bindHorizontalScroll(el: HTMLElement) {
  const view = el.ownerDocument.defaultView!;
  let drag: { id: number; x: number; scroll: number; moved: boolean } | null = null;
  let suppressClick = false;

  const release = () => {
    if (drag && el.hasPointerCapture(drag.id)) el.releasePointerCapture(drag.id);
    drag = null;
    el.classList.remove("is-dragging");
  };

  const onWheel = (event: WheelEvent) => {
    // Native horizontal deltas retain trackpad momentum. Vertical deltas scroll
    // the page unless the user explicitly requests sideways scrolling with Shift.
    if (event.ctrlKey || !event.shiftKey || event.deltaX !== 0) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1;
    const next = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + event.deltaY * unit));
    if (next === el.scrollLeft) return;
    event.preventDefault();
    el.scrollLeft = next;
  };

  const onPointerDown = (event: PointerEvent) => {
    suppressClick = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if (el.scrollWidth <= el.clientWidth) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, input, select, textarea, [contenteditable=true]")) return;
    // Let the native scrollbar handle clicks in its gutter.
    if (event.clientY >= el.getBoundingClientRect().top + el.clientTop + el.clientHeight) return;
    drag = { id: event.pointerId, x: event.clientX, scroll: el.scrollLeft, moved: false };
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      // Capture only after a drag starts, so ordinary product links still work.
      el.setPointerCapture(event.pointerId);
      el.classList.add("is-dragging");
    }
    event.preventDefault();
    el.scrollLeft = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, drag.scroll - dx));
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    suppressClick = drag.moved;
    release();
  };
  const onPointerCancel = () => release();
  const onDragStart = (event: DragEvent) => {
    // Images and links otherwise start a browser drag and cancel pointer scrolling.
    if (drag) event.preventDefault();
  };
  const onClick = (event: MouseEvent) => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("dragstart", onDragStart);
  el.addEventListener("click", onClick, true);
  view.addEventListener("pointermove", onPointerMove);
  view.addEventListener("pointerup", onPointerUp);
  view.addEventListener("pointercancel", onPointerCancel);
  view.addEventListener("blur", onPointerCancel);
  return () => {
    release();
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("dragstart", onDragStart);
    el.removeEventListener("click", onClick, true);
    view.removeEventListener("pointermove", onPointerMove);
    view.removeEventListener("pointerup", onPointerUp);
    view.removeEventListener("pointercancel", onPointerCancel);
    view.removeEventListener("blur", onPointerCancel);
  };
}
