import { useCallback, useEffect, useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import LottieImport from "lottie-react";
import type { LottieComponentProps } from "lottie-react";
import backToTopAnimation from "../assets/lottie/back-to-top.json";

/** Vite pre-bundles the CJS build; default export is the module namespace, not the component. */
const Lottie =
  typeof LottieImport === "function"
    ? LottieImport
    : (LottieImport as { default: ComponentType<LottieComponentProps> }).default;

const SHOW_AFTER_PX = 320;

export function BackToTopButton() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      className={`back-to-top-btn${visible ? " is-visible" : ""}`}
      aria-label={t("common.backToTop")}
      title={t("common.backToTop")}
    >
      <Lottie
        animationData={backToTopAnimation}
        loop
        className="back-to-top-lottie"
        aria-hidden
      />
    </button>
  );
}
