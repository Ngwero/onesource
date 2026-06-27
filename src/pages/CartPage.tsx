import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useLocalizedProduct } from "../i18n/useLocalizedProduct";
import { PageContainer } from "../components/PageContainer";
import { ProductImage } from "../components/ProductImage";
import { FREE_DELIVERY_THRESHOLD_GBP } from "../currency/currencies";
import { calcOrderTotal } from "../utils/checkout";
import type { Product } from "../types/product";

function CartLineItem({
  product,
  quantity,
  onUpdate,
  onRemove,
}: {
  product: Product;
  quantity: number;
  onUpdate: (q: number) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const localized = useLocalizedProduct(product);

  return (
    <div className="card p-3 sm:p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 w-full min-w-0">
      <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
        <Link to={`/product/${product.id}`} className="flex-shrink-0 rounded-xl overflow-hidden border border-border">
          <ProductImage
            src={product.image}
            alt={localized.localizedTitle}
            size="thumb"
          />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col">
          <Link
            to={`/product/${product.id}`}
            className="font-medium text-sm sm:text-base text-text hover:text-accent transition-colors line-clamp-2"
          >
            {localized.localizedTitle}
          </Link>
          <span className="product-unit-highlight mt-1.5 w-fit max-w-full">
            {localized.localizedUnit}
          </span>
          {product.prime && (
            <span className="text-xs font-bold text-prime mt-1 w-fit">{t("common.prime")}</span>
          )}
          <div className="mt-auto pt-2 sm:pt-3 flex items-center gap-3 sm:gap-4 flex-wrap">
            <select
              value={quantity}
              onChange={(e) => onUpdate(Number(e.target.value))}
              className="rounded-xl border border-border bg-muted px-3 py-2 text-sm font-medium outline-none focus:border-accent min-h-[44px]"
            >
              {Array.from(
                { length: Math.min(10, product.stockQuantity ?? 10) },
                (_, i) => i + 1
              ).map((n) => (
                <option key={n} value={n}>{t("cart.qty", { n })}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRemove}
              className="text-sm text-deal hover:underline font-medium min-h-[44px] px-1"
            >
              {t("common.remove")}
            </button>
          </div>
        </div>
      </div>
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:text-right flex-shrink-0 border-t sm:border-t-0 border-border pt-3 sm:pt-0">
        <span className="text-lg font-bold">{formatPrice(product.price * quantity)}</span>
      </div>
    </div>
  );
}

export function CartPage() {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { items, removeFromCart, updateQuantity, subtotal, itemCount } = useCart();

  const { delivery, total } = calcOrderTotal(subtotal);
  const untilFree = Math.max(0, FREE_DELIVERY_THRESHOLD_GBP - subtotal);

  if (items.length === 0) {
    return (
      <PageContainer className="py-12 sm:py-20">
        <div className="card p-8 sm:p-12 md:p-16 text-center max-w-lg mx-auto w-full">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6 text-3xl sm:text-4xl">
            🛒
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">{t("cart.emptyTitle")}</h1>
          <p className="text-text-muted mt-3 leading-relaxed text-sm sm:text-base">{t("cart.emptyText")}</p>
          <Link to="/categories" className="btn-primary mt-8 inline-flex w-full sm:w-auto justify-center">
            {t("cart.browseCategories")}
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="py-4 sm:py-8 pb-8 sm:pb-16 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 sm:mb-2">{t("cart.title")}</h1>
      <p className="text-text-muted text-sm sm:text-base mb-6 sm:mb-8">
        {itemCount} {itemCount === 1 ? t("common.item") : t("common.items")}
      </p>

      <div className="flex flex-col xl:flex-row gap-6 sm:gap-8 w-full">
        <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
          {items.map(({ product, quantity }) => (
            <CartLineItem
              key={product.id}
              product={product}
              quantity={quantity}
              onUpdate={(q) => updateQuantity(product.id, q)}
              onRemove={() => removeFromCart(product.id)}
            />
          ))}
        </div>

        <div className="w-full xl:w-96 xl:flex-shrink-0">
          <div className="card p-4 sm:p-6 xl:sticky xl:top-[calc(var(--site-header-height,8rem)+1rem)]">
            {untilFree > 0 && (
              <div className="mb-4 p-3 sm:p-4 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs sm:text-sm text-amber-900">
                  {t("cart.addMoreForFree", { amount: formatPrice(untilFree) })}
                </p>
                <div className="mt-2 h-2 rounded-full bg-amber-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD_GBP) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">{t("cart.subtotal")}</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-text-muted">{t("cart.delivery")}</span>
                <span className="font-semibold">
                  {delivery === 0 ? t("common.free") : formatPrice(delivery)}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-baseline mt-6 pt-6 border-t border-border gap-4">
              <span className="font-semibold">{t("cart.total")}</span>
              <span className="text-xl sm:text-2xl font-bold">{formatPrice(total)}</span>
            </div>

            <Link to="/checkout" className="btn-primary w-full mt-6 min-h-[48px] justify-center">
              {t("cart.checkout")}
            </Link>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
