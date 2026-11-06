import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { enrollOneSourcePlus, fetchMembershipMe } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { isFlagEnabled, loadFeatureFlags } from "../lib/featureFlags";

export function MembershipBenefitsCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [enabled, setEnabled] = useState(isFlagEnabled("membership"));
  const [enrolled, setEnrolled] = useState(false);
  const [threshold, setThreshold] = useState(100_000);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadFeatureFlags().then((f) => setEnabled(f.membership));
  }, []);

  useEffect(() => {
    if (!enabled || !user) return;
    fetchMembershipMe().then((m) => {
      setEnrolled(m.enrolled);
      setThreshold(m.freeDeliveryThresholdUgx);
    });
  }, [enabled, user]);

  if (!enabled) return null;

  return (
    <div className="card p-5 sm:p-6 mt-6">
      <h2 className="text-lg font-bold text-text">{t("membership.title")}</h2>
      <p className="text-sm text-text-muted mt-2 leading-relaxed">
        {t("membership.freeDeliveryCopy", { amount: formatPrice(threshold) })}
      </p>
      <p className="text-sm text-text-muted mt-2">{t("membership.noBilling")}</p>
      {user ? (
        <button
          type="button"
          className="btn-primary mt-4 min-h-[44px]"
          disabled={enrolled || busy}
          onClick={async () => {
            setBusy(true);
            const ok = await enrollOneSourcePlus();
            if (ok) setEnrolled(true);
            setBusy(false);
          }}
        >
          {enrolled ? t("membership.enrolled") : t("membership.enrollFree")}
        </button>
      ) : (
        <p className="text-sm text-text-muted mt-3">{t("membership.signInHint")}</p>
      )}
    </div>
  );
}
