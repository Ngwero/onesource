import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Edge-to-edge on small screens (no horizontal padding) */
  bleed?: boolean;
};

export function PageContainer({ children, className = "", bleed = false }: Props) {
  return (
    <div
      className={
        bleed
          ? `w-full min-w-0 ${className}`
          : `page-container w-full min-w-0 ${className}`
      }
    >
      {children}
    </div>
  );
}
