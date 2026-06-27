import { useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useLocalizedProduct } from "../i18n/useLocalizedProduct";
import { BrandLogo } from "./BrandLogo";
import { ProductImage } from "./ProductImage";
import { FREE_DELIVERY_THRESHOLD_GBP } from "../currency/currencies";
import { calcOrderTotal } from "../utils/checkout";
import type { Product } from "../types/product";

function BasketPanelLine({
  product,
  quantity,
  highlighted,
  onUpdate,
  onRemove,
  onNavigate,
}: {
  product: Product;
  quantity: number;
  highlighted?: boolean;
  onUpdate: (q: number) => void;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const localized = useLocalizedProduct(product);
  const maxQty = Math.min(10, product.stockQuantity ?? 10);

  return (
    <div className={`basket-panel-line${highlighted ? " is-highlighted" : ""}`}>
      <Link
        to={`/product/${product.id}`}
        className="basket-panel-line-thumb"
        onClick={onNavigate}
      >
        <ProductImage
          src={product.image}
          alt={localized.localizedTitle}
          size="basket"
          className="basket-panel-line-image"
        />
      </Link>
      <div className="basket-panel-line-body">
        <Link
          to={`/product/${product.id}`}
          className="basket-panel-line-title"
          onClick={onNavigate}
        >
          {localized.localizedTitle}
        </Link>
        <p className="basket-panel-line-unit">{localized.localizedUnit}</p>
        <div className="basket-panel-line-actions">
          <div className="basket-panel-qty" role="group" aria-label={t("cart.qty", { n: quantity })}>
            <button
              type="button"
              className="basket-panel-qty-btn"
              disabled={quantity <= 1}
              onClick={() => onUpdate(quantity - 1)}
              aria-label={t("basketPanel.decreaseQty")}
            >
              −
            </button>
            <span className="basket-panel-qty-value">{quantity}</span>
            <button
              type="button"
              className="basket-panel-qty-btn"
              disabled={quantity >= maxQty}
              onClick={() => onUpdate(quantity + 1)}
              aria-label={t("basketPanel.increaseQty")}
            >
              +
            </button>
          </div>
          <button type="button" className="basket-panel-line-remove" onClick={onRemove}>
            {t("common.remove")}
          </button>
        </div>
      </div>
      <div className="basket-panel-line-total">
        <span className="basket-panel-line-price">{formatPrice(product.price * quantity)}</span>
        {quantity > 1 && (
          <span className="basket-panel-line-each">
            {formatPrice(product.price)} {t("basketPanel.each")}
          </span>
        )}
      </div>
    </div>
  );
}

export function BasketSlidePanel() {
  const { t } = useTranslation();
  const location = useLocation();
  const {
    items,
    itemCount,
    subtotal,
    basketOpen,
    lastAdded,
    closeBasket,
    updateQuantity,
    removeFromCart,
  } = useCart();
  const { formatPrice } = useCurrency();
  const { delivery, total } = calcOrderTotal(subtotal);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD_GBP - subtotal);
  const freeProgress = Math.min(
    100,
    FREE_DELIVERY_THRESHOLD_GBP > 0 ? (subtotal / FREE_DELIVERY_THRESHOLD_GBP) * 100 : 0
  );

  const handleClose = useCallback(() => closeBasket(), [closeBasket]);

  useEffect(() => {
    if (!basketOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [basketOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && basketOpen) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [basketOpen, handleClose]);

  useEffect(() => {
    if (location.pathname === "/cart" || location.pathname.startsWith("/checkout")) {
      handleClose();
    }
  }, [location.pathname, handleClose]);

  if (!basketOpen) return null;

  return (
    <div className="basket-panel-root" role="presentation">
      <button
        type="button"
        className="basket-panel-backdrop"
        aria-label={t("basketPanel.close")}
        onClick={handleClose}
      />

      <aside
        className="basket-panel-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="basket-panel-title"
      >
        <header className="basket-panel-header">
          <div className="basket-panel-header-brand">
            <BrandLogo variant="icon" className="basket-panel-logo" />
            <div>
              <h2 id="basket-panel-title" className="basket-panel-title">
                {t("basketPanel.title")}
              </h2>
              <p className="basket-panel-subtitle">
                {itemCount === 0
                  ? t("basketPanel.emptySubtitle")
                  : t("basketPanel.itemCount", { count: itemCount })}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="basket-panel-close"
            onClick={handleClose}
            aria-label={t("basketPanel.close")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {lastAdded && (
          <div className="basket-panel-added" role="status">
            <span className="basket-panel-added-icon" aria-hidden>
              ✓
            </span>
            <p className="basket-panel-added-text">
              {t("basketPanel.added", { count: lastAdded.quantityAdded })}
            </p>
          </div>
        )}

        {itemCount > 0 && (
          <div className="basket-panel-delivery">
            <div className="basket-panel-delivery-track">
              <div
                className="basket-panel-delivery-fill"
                style={{ width: `${freeProgress}%` }}
              />
            </div>
            <p className="basket-panel-delivery-text">
              {remaining > 0
                ? t("basketPanel.freeDeliveryRemaining", {
                    amount: formatPrice(remaining),
                  })
                : t("basketPanel.freeDeliveryUnlocked")}
            </p>
          </div>
        )}

        <div className="basket-panel-body">
          {items.length === 0 ? (
            <div className="basket-panel-empty">
              <p>{t("basketPanel.emptyMessage")}</p>
              <button type="button" className="btn-secondary" onClick={handleClose}>
                {t("basketPanel.continueShopping")}
              </button>
            </div>
          ) : (
            <ul className="basket-panel-list">
              {items.map(({ product, quantity }) => (
                <li key={product.id}>
                  <BasketPanelLine
                    product={product}
                    quantity={quantity}
                    highlighted={lastAdded?.product.id === product.id}
                    onUpdate={(q) => updateQuantity(product.id, q)}
                    onRemove={() => removeFromCart(product.id)}
                    onNavigate={handleClose}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="basket-panel-footer">
          {itemCount > 0 && (
            <div className="basket-panel-totals">
              <div className="basket-panel-total-row">
                <span>{t("cart.subtotal")}</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="basket-panel-total-row">
                <span>{t("cart.delivery")}</span>
                <span>{delivery === 0 ? t("cart.freeSameDay") : formatPrice(delivery)}</span>
              </div>
              <div className="basket-panel-total-row basket-panel-total-row--grand">
                <span>{t("cart.total")}</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          )}
          <Link
            to="/cart"
            className={`basket-panel-checkout${itemCount === 0 ? " is-disabled" : ""}`}
            onClick={(e) => {
              if (itemCount === 0) e.preventDefault();
              else handleClose();
            }}
          >
            {t("basketPanel.goToBasket")}
          </Link>
          <button type="button" className="basket-panel-continue" onClick={handleClose}>
            {t("basketPanel.continueShopping")}
          </button>
        </footer>
      </aside>
    </div>
  );
}
