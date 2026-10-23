import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Title + content only — no wrapping panel. */
  plain?: boolean;
};

export function Section({
  title,
  subtitle,
  action,
  children,
  className = "",
  plain = false,
}: Props) {
  return (
    <section
      className={`${plain ? "w-full min-w-0" : "card p-3 sm:p-6 md:p-8 w-full min-w-0"} ${className}`.trim()}
    >
      <div
        className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 ${
          plain ? "mb-3" : "mb-4 sm:mb-6"
        }`}
      >
        <div className="min-w-0">
          <h2 className="section-title text-xl sm:text-2xl">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
