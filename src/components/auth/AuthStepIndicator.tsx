import { useTranslation } from "react-i18next";

type Step = "credentials" | "otp";

type Props = {
  step: Step;
};

export function AuthStepIndicator({ step }: Props) {
  const { t } = useTranslation();
  const steps = [
    { id: "credentials" as const, label: t("auth.stepCredentials") },
    { id: "otp" as const, label: t("auth.stepVerify") },
  ];

  const activeIndex = step === "otp" ? 1 : 0;

  return (
    <ol className="auth-steps" aria-label={t("auth.loginTitle")}>
      {steps.map((item, index) => {
        const isActive = index === activeIndex;
        const isComplete = index < activeIndex;

        return (
          <li
            key={item.id}
            className={`auth-step ${isActive ? "auth-step--active" : ""} ${isComplete ? "auth-step--complete" : ""}`}
            aria-current={isActive ? "step" : undefined}
          >
            <span className="auth-step-marker">{isComplete ? "✓" : index + 1}</span>
            <span className="auth-step-label">{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
