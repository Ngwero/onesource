import { useState } from "react";
import { useTranslation } from "react-i18next";
import { submitReturnRequest } from "../api/client";
import { isFlagEnabled } from "../lib/featureFlags";
import type { Order } from "../types/order";

type Props = { order: Order };

export function OrderReturnForm({ order }: Props) {
  const { t } = useTranslation();
  const [orderItemId, setOrderItemId] = useState(order.order_items?.[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isFlagEnabled("returns")) return null;
  const items = order.order_items ?? [];
  if (!items.length) return null;

  return (
    <div className="card p-5 sm:p-6 mt-5">
      <h2 className="text-lg font-bold text-text">{t("returns.title")}</h2>
      <p className="text-sm text-text-muted mt-1">{t("returns.noRefundNote")}</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setStatus("sending");
          setError(null);
          const form = new FormData();
          form.set("orderId", order.id);
          form.set("orderItemId", orderItemId);
          const item = items.find((i) => i.id === orderItemId);
          if (item?.product_id) form.set("productId", item.product_id);
          form.set("reason", reason);
          if (photo) form.set("photo", photo);
          const result = await submitReturnRequest(form);
          if (result.ok) {
            setStatus("ok");
            setReason("");
            setPhoto(null);
          } else {
            setStatus("err");
            setError(result.error || t("errors.genericLoad"));
          }
        }}
      >
        <label className="block text-sm">
          <span className="font-medium">{t("returns.item")}</span>
          <select
            className="mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2"
            value={orderItemId}
            onChange={(e) => setOrderItemId(e.target.value)}
          >
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.product_title}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("returns.reason")}</span>
          <textarea
            required
            rows={3}
            className="mt-1 w-full rounded-xl border border-border bg-muted px-3 py-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("returns.photo")}</span>
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-sm"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
        </label>
        <button type="submit" className="btn-primary min-h-[44px]" disabled={status === "sending"}>
          {status === "sending" ? t("common.loading") : t("returns.submit")}
        </button>
        {status === "ok" && <p className="text-sm text-prime">{t("returns.submitted")}</p>}
        {status === "err" && error && <p className="text-sm text-deal">{error}</p>}
      </form>
    </div>
  );
}
