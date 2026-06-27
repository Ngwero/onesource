import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { OrderProgressRoadmap } from "../components/OrderProgressRoadmap";
import { useAuth } from "../context/AuthContext";
import { useCurrency } from "../context/CurrencyContext";
import { fetchOrderById } from "../api/client";
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

export function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user?.id) {
      setLoading(false);
      return;
    }
    fetchOrderById(id, user.id)
      .then((o) => setOrder(o ?? null))
      .catch((e) => setError(e instanceof Error ? e.message : t("errors.genericLoad")))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  if (loading) {
    return (
      <PageContainer className="py-20 flex justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </PageContainer>
    );
  }

  if (error || !order) {
    return (
      <PageContainer className="py-10 sm:py-14 text-center">
        <p className="text-text-muted">{error ?? t("common.notFound")}</p>
        <Link to="/orders" className="btn-primary mt-6 inline-flex">
          {t("orders.detail.backToOrders")}
        </Link>
      </PageContainer>
    );
  }

  const items = order.order_items ?? [];

  return (
    <PageContainer className="py-10 sm:py-14">
      <Link to="/orders" className="text-sm text-accent hover:underline font-medium">
        ← {t("orders.detail.backToOrders")}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">{t("orders.trackOrder")}</h1>
          <p className="text-sm text-text-muted mt-1">
            {t("checkout.orderId")}{" "}
            <span className="font-mono">{order.id.slice(0, 8)}</span>
            {" · "}
            {formatDate(order.created_at)}
          </p>
        </div>
        <p className="text-xl font-bold text-accent">{formatPrice(Number(order.total))}</p>
      </div>

      <div className="card p-5 sm:p-6 mt-6">
        <h2 className="text-sm font-bold text-text uppercase tracking-wide mb-4">
          {t("orders.trackOrder")}
        </h2>
        <OrderProgressRoadmap status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text mb-3">{t("orders.detail.deliveryTo")}</h2>
          <p className="font-semibold text-text">{order.full_name}</p>
          <p className="text-sm text-text-muted mt-1">{order.email}</p>
          {order.phone && <p className="text-sm text-text-muted">{order.phone}</p>}
          <p className="text-sm text-text mt-3 leading-relaxed">
            {order.address_line1}
            {order.address_line2 ? `, ${order.address_line2}` : ""}
            <br />
            {order.city}
            {order.district ? `, ${order.district}` : ""}
          </p>
          {order.notes && (
            <p className="text-sm text-text-muted mt-2 italic">{order.notes}</p>
          )}
        </div>

        <div className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-text mb-3">{t("orders.detail.itemsHeading")}</h2>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-3 first:pt-0">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-text">{item.product_title}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {t("cart.qty", { n: item.quantity })} × {formatPrice(Number(item.unit_price))}
                  </p>
                </div>
                <span className="font-semibold text-sm shrink-0">
                  {formatPrice(Number(item.line_total))}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 pt-4 border-t border-border text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-text-muted">{t("cart.subtotal")}</dt>
              <dd className="font-medium">{formatPrice(Number(order.subtotal))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">{t("cart.delivery")}</dt>
              <dd className="font-medium">
                {Number(order.delivery_fee) === 0
                  ? t("common.free")
                  : formatPrice(Number(order.delivery_fee))}
              </dd>
            </div>
            <div className="flex justify-between text-base pt-1">
              <dt className="font-bold">{t("cart.total")}</dt>
              <dd className="font-bold">{formatPrice(Number(order.total))}</dd>
            </div>
          </dl>
        </div>
      </div>
    </PageContainer>
  );
}
