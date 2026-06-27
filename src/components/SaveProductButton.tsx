import { useTranslation } from "react-i18next";
import { useSavedList } from "../context/SavedListContext";

type Props = {
  productId: string;
  className?: string;
  size?: "sm" | "md";
};

export function SaveProductButton({ productId, className = "", size = "sm" }: Props) {
  const { t } = useTranslation();
  const { isSaved, toggleSaved } = useSavedList();
  const saved = isSaved(productId);

  return (
    <button
      type="button"
      className={`save-product-btn save-product-btn--${size} ${
        saved ? "save-product-btn--saved" : ""
      } ${className}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(productId);
      }}
      aria-label={saved ? t("lists.saved") : t("lists.save")}
      aria-pressed={saved}
    >
      <svg
        viewBox="0 0 24 24"
        width={size === "md" ? 22 : 18}
        height={size === "md" ? 22 : 18}
        aria-hidden
        className="save-product-btn-icon"
      >
        {saved ? (
          <path
            fill="currentColor"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        ) : (
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        )}
      </svg>
    </button>
  );
}
