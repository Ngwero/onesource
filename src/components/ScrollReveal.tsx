import { type CSSProperties, type ElementType, type ReactNode } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

type Variant = "fade-up" | "fade" | "fade-down";

type Props = {
  children: ReactNode;
  className?: string;
  variant?: Variant;
  /** Delay before the reveal animation starts (ms). */
  delay?: number;
  /** Stagger fade-up on direct children (best for small lists). */
  stagger?: boolean;
  as?: ElementType;
  style?: CSSProperties;
};

export function ScrollReveal({
  children,
  className = "",
  variant = "fade-up",
  delay = 0,
  stagger = false,
  as: Tag = "div",
  style,
}: Props) {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  const classes = [
    "scroll-reveal",
    stagger ? "scroll-reveal--stagger" : `scroll-reveal--${variant}`,
    visible && "scroll-reveal--visible",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const combinedStyle: CSSProperties = {
    ...style,
    ...(delay > 0 ? ({ "--scroll-reveal-delay": `${delay}ms` } as CSSProperties) : {}),
  };

  return (
    <Tag ref={ref} className={classes} style={combinedStyle}>
      {children}
    </Tag>
  );
}
