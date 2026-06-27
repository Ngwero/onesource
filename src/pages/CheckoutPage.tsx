import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageContainer } from "../components/PageContainer";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { createOrder } from "../api/client";
import { calcOrderTotal } from "../utils/checkout";
import { getLocalizedProductFields } from "../i18n/useLocalizedProduct";

export function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const { items, subtotal, clearCart } = useCart();
  const { formatPrice } = useCurrency();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { delivery, total } = calcOrderTotal(subtotal);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "mobile">("cod");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart", { replace: true });
      return;
    }
    setCity((c) => c || t("checkout.defaultCity"));
    setDistrict((d) => d || t("checkout.defaultDistrict"));
    const name =
      profile?.full_name?.trim() ||
      (user?.user_metadata?.full_name as string | undefined)?.trim() ||
      "";
    if (name) setFullName(name);
    if (user?.email) setEmail(user.email);
  }, [items.length, navigate, profile, user, t]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const order = await createOrder({
        userId: user?.id,
        email: email.trim(),
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim() || undefined,
        city: city.trim(),
        district: district.trim() || undefined,
        notes: notes.trim() || undefined,
        subtotal,
        deliveryFee: delivery,
        total,
        items: items.map(({ product, quantity }) => {
          const { localizedTitle } = getLocalizedProductFields(product, t, i18n.language);
          return {
            productId: product.id,
            title: localizedTitle,
            image: product.image,
            unitPrice: product.price,
            quantity,
          };
        }),
      });

      clearCart();
      navigate(`/checkout/confirmation/${order.id}`, {
        replace: true,
        state: { paymentMethod },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("checkout.placeOrderFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <PageContainer className="py-6 sm:py-10 pb-12">
      <nav className="text-sm text-text-muted mb-6 flex flex-wrap gap-2 items-center">
        <Link to="/cart" className="hover:text-accent">
          {t("cart.title")}
        </Link>
        <span>/</span>
        <span className="text-text font-medium">{t("checkout.title")}</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight">{t("checkout.title")}</h1>
      <p className="text-sm text-text-muted mt-2">{t("checkout.subtitle")}</p>

      {!user && (
        <p className="mt-4 text-sm bg-accent-light border border-accent/20 rounded-xl px-4 py-3">
          {t("checkout.guestHint")}{" "}
          <Link to="/login" state={{ from: "/checkout" }} className="font-semibold text-accent hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-4">{t("checkout.delivery")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5" htmlFor="co-name">
                  {t("auth.fullName")} *
                </label>
                <input
                  id="co-name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" htmlFor="co-email">
                  {t("auth.email")} *
                </label>
                <input
                  id="co-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" htmlFor="co-phone">
                  {t("checkout.phone")}
                </label>
                <input
                  id="co-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("checkout.phonePlaceholder")}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5" htmlFor="co-address">
                  {t("checkout.address")} *
                </label>
                <input
                  id="co-address"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5" htmlFor="co-address2">
                  {t("checkout.address2")}
                </label>
                <input
                  id="co-address2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" htmlFor="co-city">
                  {t("checkout.city")} *
                </label>
                <input
                  id="co-city"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" htmlFor="co-district">
                  {t("checkout.district")}
                </label>
                <input
                  id="co-district"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-1.5" htmlFor="co-notes">
                  {t("checkout.notes")}
                </label>
                <textarea
                  id="co-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y"
                />
              </div>
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold text-text mb-4">{t("checkout.payment")}</h2>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 rounded-xl border border-border cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent-light/50">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-sm">{t("checkout.payOnDelivery")}</p>
                  <p className="text-xs text-text-muted mt-1">{t("checkout.payOnDeliveryHint")}</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-xl border border-border cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent-light/50">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === "mobile"}
                  onChange={() => setPaymentMethod("mobile")}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-sm">{t("checkout.mobileMoney")}</p>
                  <p className="text-xs text-text-muted mt-1">{t("checkout.mobileMoneyHint")}</p>
                </div>
              </label>
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-[calc(var(--site-header-height,8rem)+1rem)] lg:self-start">
          <div className="card p-5 sm:p-6">
            <h2 className="font-bold text-text mb-4">{t("checkout.orderSummary")}</h2>
            <ul className="space-y-2 text-sm max-h-48 overflow-y-auto mb-4">
              {items.map(({ product, quantity }) => {
                const { localizedTitle } = getLocalizedProductFields(product, t, i18n.language);
                return (
                <li key={product.id} className="flex justify-between gap-2">
                  <span className="text-text-muted line-clamp-1">
                    {localizedTitle} × {quantity}
                  </span>
                  <span className="font-medium shrink-0">
                    {formatPrice(product.price * quantity)}
                  </span>
                </li>
              );
              })}
            </ul>
            <div className="space-y-2 text-sm border-t border-border pt-4">
              <div className="flex justify-between">
                <span className="text-text-muted">{t("cart.subtotal")}</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">{t("cart.delivery")}</span>
                <span className="font-semibold">
                  {delivery === 0 ? t("common.free") : formatPrice(delivery)}
                </span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-border">
                <span className="font-bold">{t("cart.total")}</span>
                <span className="font-bold">{formatPrice(total)}</span>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-deal bg-deal/10 border border-deal/30 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-6 min-h-[48px] disabled:opacity-50"
            >
              {submitting ? t("checkout.placingOrder") : t("checkout.placeOrder")}
            </button>
            <Link to="/cart" className="block text-center text-sm text-accent mt-3 hover:underline">
              {t("checkout.backToCart")}
            </Link>
          </div>
        </div>
      </form>
    </PageContainer>
  );
}
