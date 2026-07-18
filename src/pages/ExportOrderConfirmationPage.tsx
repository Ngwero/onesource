import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createOrder } from "../api/client";
import { PageContainer } from "../components/PageContainer";
import { ProductImage } from "../components/ProductImage";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { getLocalizedProductFields } from "../i18n/useLocalizedProduct";
import { isExportProduct } from "../utils/exportOrder";

const DESTINATION_HINTS = [
  "United Kingdom",
  "United Arab Emirates",
  "Belgium",
  "Netherlands",
  "Germany",
  "Kenya",
];

export function ExportOrderConfirmationPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { items, updateQuantity, removeFromCart } = useCart();
  const { formatPrice } = useCurrency();
  const exportItems = useMemo(
    () => items.filter(({ product }) => isExportProduct(product)),
    [items]
  );
  const itemCount = exportItems.reduce((sum, { quantity }) => sum + quantity, 0);
  const subtotal = exportItems.reduce(
    (sum, { product, quantity }) => sum + product.price * quantity,
    0
  );

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const name =
      profile?.full_name?.trim() ||
      (user?.user_metadata?.full_name as string | undefined)?.trim() ||
      "";
    if (name) setFullName((current) => current || name);
    if (user?.email) setEmail((current) => current || user.email || "");
  }, [profile, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (exportItems.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const order = await createOrder({
        orderType: "export",
        userId: user?.id,
        email: email.trim(),
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        addressLine1: address.trim(),
        addressLine2: company.trim() || undefined,
        city: city.trim(),
        district: country.trim(),
        notes: notes.trim() || undefined,
        subtotal,
        deliveryFee: 0,
        total: subtotal,
        items: exportItems.map(({ product, quantity }) => {
          const { localizedTitle } = getLocalizedProductFields(
            product,
            t,
            i18n.language
          );
          return {
            productId: product.id,
            title: localizedTitle,
            image: product.image,
            unitPrice: product.price,
            quantity,
          };
        }),
      });

      exportItems.forEach(({ product }) => removeFromCart(product.id));
      navigate(`/checkout/confirmation/${order.id}`, {
        replace: true,
        state: { orderType: "export" },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("exports.confirmation.submitFailed")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (exportItems.length === 0) {
    return (
      <div className="export-confirm-page">
        <PageContainer className="py-12 sm:py-20">
          <div className="export-confirm-empty">
            <div className="export-confirm-empty-icon" aria-hidden>
              ✈
            </div>
            <h1>{t("exports.confirmation.emptyTitle")}</h1>
            <p>{t("exports.confirmation.emptyText")}</p>
            <Link to="/exports" className="btn-primary mt-6 inline-flex">
              {t("exports.confirmation.browse")}
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  const summary = (
    <div className="export-confirm-summary">
      <div className="export-confirm-summary-head">
        <h2>{t("exports.confirmation.orderSummary")}</h2>
        <span>
          {itemCount} {itemCount === 1 ? t("common.item") : t("common.items")}
        </span>
      </div>

      <ul className="export-confirm-lines">
        {exportItems.map(({ product, quantity }) => {
          const { localizedTitle } = getLocalizedProductFields(
            product,
            t,
            i18n.language
          );
          return (
            <li key={product.id} className="export-confirm-line">
              <ProductImage
                src={product.image}
                alt={localizedTitle}
                size="basket"
                className="export-confirm-line-image"
              />
              <div className="export-confirm-line-body">
                <p className="export-confirm-line-title">{localizedTitle}</p>
                <p className="export-confirm-line-unit">{product.unit}</p>
                <div className="export-confirm-line-controls">
                  <label className="export-confirm-qty">
                    <span className="sr-only">{t("product.quantityLabel")}</span>
                    <select
                      value={quantity}
                      onChange={(event) =>
                        updateQuantity(product.id, Number(event.target.value))
                      }
                    >
                      {Array.from(
                        {
                          length: Math.min(10, product.stockQuantity ?? 10),
                        },
                        (_, index) => index + 1
                      ).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="export-confirm-line-price">
                    {formatPrice(product.price * quantity)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(product.id)}
                  className="export-confirm-remove"
                >
                  {t("common.remove")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="export-confirm-totals">
        <div className="export-confirm-total-row">
          <span>{t("exports.confirmation.estimatedTotal")}</span>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        <p className="export-confirm-freight">
          {t("exports.confirmation.freightNotice")}
        </p>
      </div>

      {error && <p className="export-confirm-error">{error}</p>}

      <button
        type="submit"
        form="export-confirm-form"
        disabled={submitting}
        className="btn-primary export-confirm-submit"
      >
        {submitting
          ? t("exports.confirmation.submitting")
          : t("exports.confirmation.confirm")}
      </button>
      <Link to="/exports" className="export-confirm-add-more">
        {t("exports.confirmation.addMore")}
      </Link>
    </div>
  );

  return (
    <div className="export-confirm-page">
      <PageContainer className="py-6 pb-24 sm:py-10 sm:pb-14">
        <nav className="export-confirm-breadcrumb" aria-label={t("common.breadcrumb")}>
          <Link to="/exports">{t("nav.exports")}</Link>
          <span aria-hidden>/</span>
          <span>{t("exports.confirmation.title")}</span>
        </nav>

        <header className="export-confirm-hero">
          <div>
            <span className="export-confirm-badge">
              {t("exports.confirmation.badge")}
            </span>
            <h1>{t("exports.confirmation.title")}</h1>
            <p>{t("exports.confirmation.subtitle")}</p>
          </div>

          <ol className="export-confirm-steps" aria-label={t("exports.confirmation.stepsLabel")}>
            <li>
              <span>1</span>
              {t("exports.confirmation.stepSelect")}
            </li>
            <li className="is-active" aria-current="step">
              <span>2</span>
              {t("exports.confirmation.stepDetails")}
            </li>
            <li>
              <span>3</span>
              {t("exports.confirmation.stepConfirm")}
            </li>
          </ol>
        </header>

        <div className="export-confirm-layout">
          <form
            id="export-confirm-form"
            onSubmit={handleSubmit}
            className="export-confirm-form"
          >
            <section className="export-confirm-panel">
              <div className="export-confirm-panel-head">
                <span className="export-confirm-step-num">1</span>
                <div>
                  <h2>{t("exports.confirmation.buyerDetails")}</h2>
                  <p>{t("exports.confirmation.buyerHint")}</p>
                </div>
              </div>
              <div className="export-confirm-grid">
                <label>
                  <span>{t("auth.fullName")} *</span>
                  <input
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder={t("exports.confirmation.namePlaceholder")}
                  />
                </label>
                <label>
                  <span>{t("exports.confirmation.company")}</span>
                  <input
                    autoComplete="organization"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder={t("exports.confirmation.companyPlaceholder")}
                  />
                </label>
                <label>
                  <span>{t("auth.email")} *</span>
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={t("exports.confirmation.emailPlaceholder")}
                  />
                </label>
                <label>
                  <span>{t("checkout.phone")} *</span>
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder={t("exports.confirmation.phonePlaceholder")}
                  />
                </label>
              </div>
            </section>

            <section className="export-confirm-panel">
              <div className="export-confirm-panel-head">
                <span className="export-confirm-step-num">2</span>
                <div>
                  <h2>{t("exports.confirmation.destination")}</h2>
                  <p>{t("exports.confirmation.destinationHint")}</p>
                </div>
              </div>
              <div className="export-confirm-grid">
                <label>
                  <span>{t("exports.confirmation.country")} *</span>
                  <input
                    required
                    list="export-destination-countries"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    placeholder={t("exports.confirmation.countryPlaceholder")}
                  />
                  <datalist id="export-destination-countries">
                    {DESTINATION_HINTS.map((hint) => (
                      <option key={hint} value={hint} />
                    ))}
                  </datalist>
                </label>
                <label>
                  <span>{t("checkout.city")} *</span>
                  <input
                    required
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder={t("exports.confirmation.cityPlaceholder")}
                  />
                </label>
                <label className="export-confirm-span-2">
                  <span>{t("exports.confirmation.deliveryAddress")} *</span>
                  <input
                    required
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder={t("exports.confirmation.addressPlaceholder")}
                  />
                </label>
                <label className="export-confirm-span-2">
                  <span>{t("exports.confirmation.requirements")}</span>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={t("exports.confirmation.requirementsPlaceholder")}
                  />
                </label>
              </div>

              <div className="export-confirm-chips" role="group" aria-label={t("exports.confirmation.country")}>
                {DESTINATION_HINTS.map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    className={country === hint ? "is-active" : undefined}
                    onClick={() => setCountry(hint)}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </section>
          </form>

          <aside className="export-confirm-aside">{summary}</aside>
        </div>

        <div className="export-confirm-mobile-bar">
          <div>
            <span>{t("exports.confirmation.estimatedTotal")}</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <button
            type="submit"
            form="export-confirm-form"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting
              ? t("exports.confirmation.submitting")
              : t("exports.confirmation.confirm")}
          </button>
        </div>
      </PageContainer>
    </div>
  );
}
