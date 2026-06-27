import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { OrderProgressRoadmap } from "../components/OrderProgressRoadmap";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { fetchOrders } from "../api/client";
import type { Order } from "../types/order";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    fetchOrders(user.id)
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : t("errors.genericLoad")))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <PageContainer className="py-10 sm:py-14">
      <h1 className="text-2xl sm:text-3xl font-bold text-text">{t("accountMenu.orders")}</h1>
      <p className="text-sm text-text-muted mt-2">{t("orders.subtitle")}</p>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <p className="mt-6 text-sm text-deal bg-deal/10 border border-deal/30 rounded-xl px-4 py-3 max-w-lg">
          {error}
          <span className="block mt-2 text-text-muted">{t("orders.runSqlHint")}</span>
        </p>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="card p-8 sm:p-12 mt-8 text-center max-w-lg mx-auto">
          <p className="text-text-muted">{t("orders.empty")}</p>
          <Link to="/products" className="btn-primary mt-6 inline-flex">
            {t("common.browseAll")}
          </Link>
        </div>
      )}

      <ul className="mt-8 space-y-5">
        {orders.map((order) => (
          <li key={order.id} className="card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-text-muted">{formatDate(order.created_at)}</p>
                <p className="font-semibold text-text mt-1">
                  {t("checkout.orderId")}{" "}
                  <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>
                </p>
                <p className="text-sm text-text-muted mt-1">
                  {order.order_items?.length ?? 0}{" "}
                  {(order.order_items?.length ?? 0) === 1 ? t("common.item") : t("common.items")}
                  {" · "}
                  {order.city}
                </p>
              </div>
              <span className="text-lg font-bold text-accent">{formatPrice(Number(order.total))}</span>
            </div>

            <OrderProgressRoadmap status={order.status} compact />

            <div className="flex flex-wrap justify-end gap-3 mt-4 pt-4 border-t border-border">
              <Link
                to={`/orders/${order.id}`}
                className="text-sm font-semibold text-accent hover:underline"
              >
                {t("orders.viewDetails")}
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
}
