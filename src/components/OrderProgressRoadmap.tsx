import { useTranslation } from "react-i18next";

const DELIVERY_STEPS = [
  "placed",
  "confirmed",
  "out_for_delivery",
  "delivered",
] as const;

type StepId = (typeof DELIVERY_STEPS)[number];

const STATUS_LABEL_KEYS: Record<string, string> = {
  placed: "orders.statusPlaced",
  confirmed: "orders.statusConfirmed",
  out_for_delivery: "orders.statusOutForDelivery",
  delivered: "orders.statusDelivered",
  cancelled: "orders.statusCancelled",
};

type StepState = "completed" | "current" | "upcoming" | "cancelled";

function stepState(orderStatus: string, step: StepId): StepState {
  if (orderStatus === "cancelled") return "cancelled";
  const currentIdx = DELIVERY_STEPS.indexOf(orderStatus as StepId);
  const stepIdx = DELIVERY_STEPS.indexOf(step);
  if (currentIdx < 0) return stepIdx === 0 ? "current" : "upcoming";
  if (stepIdx < currentIdx) return "completed";
  if (stepIdx === currentIdx) return "current";
  return "upcoming";
}

type Props = {
  status: string;
  compact?: boolean;
};

export function OrderProgressRoadmap({ status, compact = false }: Props) {
  const { t } = useTranslation();
  const statusLabel = t(STATUS_LABEL_KEYS[status] ?? "orders.statusPlaced");

  if (status === "cancelled") {
    return (
      <div className="order-roadmap order-roadmap-cancelled rounded-xl border border-deal/30 bg-deal/10 px-4 py-3">
        <p className="text-sm font-semibold text-deal">{t("orders.roadmap.cancelledTitle")}</p>
        <p className="text-xs text-text-muted mt-1">{t("orders.roadmap.cancelledHint")}</p>
      </div>
    );
  }

  return (
    <div
      className={`order-roadmap ${compact ? "order-roadmap-compact" : ""}`}
      aria-label={t("orders.roadmap.ariaLabel")}
    >
      <ol className="order-roadmap-steps">
        {DELIVERY_STEPS.map((step, index) => {
          const state = stepState(status, step);
          const isLast = index === DELIVERY_STEPS.length - 1;
          return (
            <li
              key={step}
              className={`order-roadmap-step order-roadmap-step--${state}${isLast ? " order-roadmap-step--last" : ""}`}
            >
              <div className="order-roadmap-marker" aria-hidden>
                {state === "completed" ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="order-roadmap-dot" />
                )}
              </div>
              <div className="order-roadmap-content min-w-0">
                <p className="order-roadmap-label">{t(`orders.roadmap.steps.${step}.title`)}</p>
                {!compact && (
                  <p className="order-roadmap-desc">{t(`orders.roadmap.steps.${step}.desc`)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="order-roadmap-current text-sm font-medium text-accent mt-3">
        {t("orders.roadmap.currentStatus", { status: statusLabel })}
      </p>
    </div>
  );
}
