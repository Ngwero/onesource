import { useEffect, useState } from "react";
const MOBILE_QUERY = "(max-width: 767px)";

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
