import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const MOBILE_QUERY = "(max-width: 767px)";

let sheetLocks = 0;

function lockPageScroll() {
  sheetLocks += 1;
  document.documentElement.classList.add("header-switcher-sheet-open");
}

function unlockPageScroll() {
  sheetLocks = Math.max(0, sheetLocks - 1);
  if (sheetLocks === 0) {
    document.documentElement.classList.remove("header-switcher-sheet-open");
  }
}

export function useMobileSwitcherLayout() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(MOBILE_QUERY).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}

/** True when the event happened inside an open mobile switcher sheet (portaled to body). */
export function isSwitcherSheetTarget(target: EventTarget | null) {
  const el =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  return !!el?.closest(".header-switcher-sheet-root");
}

/**
 * Desktop: anchored dropdown. Phone widths: a bottom sheet portaled to `document.body`
 * so it is not clipped by the sticky header (backdrop-filter / overflow) or the viewport edges.
 */
export function HeaderSwitcherMenu({
  open,
  label,
  onClose,
  desktopClassName,
  children,
}: {
  open: boolean;
  label: string;
  onClose: () => void;
  desktopClassName: string;
  children: ReactNode;
}) {
  const mobile = useMobileSwitcherLayout();

  useEffect(() => {
    if (!open || !mobile) return;
    lockPageScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      unlockPageScroll();
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mobile, onClose]);

  if (!open) return null;

  if (mobile) {
    return createPortal(
      <div
        className="header-switcher-sheet-root"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="header-switcher-sheet-backdrop"
          aria-label={label}
          onClick={onClose}
        />
        <div
          className="header-switcher-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="header-switcher-sheet-handle" aria-hidden />
          {children}
        </div>
      </div>,
      document.body
    );
  }

  return <div className={desktopClassName}>{children}</div>;
}
