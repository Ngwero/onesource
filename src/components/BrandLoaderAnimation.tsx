import type { ComponentType } from "react";
import LottieImport from "lottie-react";
import type { LottieComponentProps } from "lottie-react";
import loaderAnimation from "../assets/lottie/onesource-loader.json";

/** Vite pre-bundles the CJS build; default export is the module namespace, not the component. */
const Lottie =
  typeof LottieImport === "function"
    ? LottieImport
    : (LottieImport as { default: ComponentType<LottieComponentProps> }).default;

type Props = {
  animate: boolean;
  className?: string;
};

/** The animation is pure white; callers provide a dark surface behind it. */
export default function BrandLoaderAnimation({ animate, className }: Props) {
  return (
    <Lottie
      animationData={loaderAnimation}
      loop={animate}
      autoplay={animate}
      className={className}
      rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      aria-hidden
    />
  );
}
