import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { OrderProgressRoadmap } from "../components/OrderProgressRoadmap";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { fetchOrderById } from "../api/client";
import type { Order } from "../types/order";

export function CheckoutConfirmationPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const location = useLocation();
  const paymentMethod = (location.state as { paymentMethod?: string } | null)?.paymentMethod;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchOrderById(id, user?.id)
      .then((o) => setOrder(o ?? null))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  if (loading) {
    return (
      <PageContainer className="py-20 flex justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-10 sm:py-14">
      <div className="max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text">{t("checkout.confirmedTitle")}</h1>
        <p className="text-text-muted mt-3 text-sm sm:text-base leading-relaxed">
          {t("checkout.confirmedSubtitle")}
        </p>

        {order && (
          <div className="card p-6 mt-8 text-left">
            <h2 className="text-sm font-bold text-text mb-3">{t("orders.trackOrder")}</h2>
            <OrderProgressRoadmap status={order.status} />
          </div>
        )}

        {order && (
          <div className="card p-6 mt-4 text-left text-sm space-y-3">
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">{t("checkout.orderId")}</span>
              <span className="font-mono text-xs font-semibold">{order.id.slice(0, 8)}…</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">{t("cart.total")}</span>
              <span className="font-bold">{formatPrice(Number(order.total))}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-muted">{t("checkout.delivery")}</span>
              <span>
                {order.address_line1}, {order.city}
              </span>
            </div>
            {paymentMethod && (
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">{t("checkout.payment")}</span>
                <span>
                  {paymentMethod === "mobile"
                    ? t("checkout.mobileMoney")
                    : t("checkout.payOnDelivery")}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
          {user ? (
            <Link to="/orders" className="btn-primary min-h-[48px] justify-center">
              {t("checkout.viewOrders")}
            </Link>
          ) : (
            <Link to="/login" state={{ from: "/orders" }} className="btn-primary min-h-[48px] justify-center">
              {t("auth.signIn")}
            </Link>
          )}
          <Link to="/" className="btn-secondary min-h-[48px] justify-center">
            {t("common.backToShop")}
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
