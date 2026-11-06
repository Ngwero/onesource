import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  askProductQuestion,
  fetchProductQuestions,
  type ProductQuestion,
} from "../../api/client";

type Props = {
  productId: string;
};

export function ProductQaSection({ productId }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetchProductQuestions(productId)
      .then((list) => {
        if (!cancelled) setQuestions(list);
      })
      .catch(() => {
        if (!cancelled) setQuestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || text.trim().length < 5) return;
    setSubmitting(true);
    setError(null);
    try {
      const q = await askProductQuestion(productId, text.trim());
      setQuestions((prev) => [q, ...prev]);
      setText("");
    } catch (err) {
      const message = err instanceof Error ? err.message : t("productQa.submitFailed");
      if (/not enabled/i.test(message)) setUnavailable(true);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="pdp-qa" className="pdp-qa scroll-mt-24 mt-10">
      <h2 className="pdp-details-heading-lg">{t("productQa.title")}</h2>
      <p className="text-sm text-text-muted mt-1 mb-4">{t("productQa.subtitle")}</p>

      {!loaded ? (
        <p className="text-sm text-text-muted">{t("common.loading")}</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-text-muted">{t("productQa.empty")}</p>
      ) : (
        <ul className="space-y-4 mb-6">
          {questions.map((q) => (
            <li key={q.id} className="border-b border-border pb-3">
              <p className="text-sm font-semibold text-text">Q: {q.question}</p>
              {q.answer ? (
                <p className="text-sm text-text-muted mt-1">A: {q.answer}</p>
              ) : (
                <p className="text-xs text-text-muted mt-1">{t("productQa.awaitingAnswer")}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {unavailable ? (
        <p className="text-sm text-text-muted">{t("productQa.unavailable")}</p>
      ) : user ? (
        <form onSubmit={onSubmit} className="max-w-xl space-y-2">
          <label className="block text-sm">
            <span className="font-medium">{t("productQa.askLabel")}</span>
            <textarea
              className="mt-1 block w-full border border-border rounded-md px-3 py-2 min-h-[72px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              minLength={5}
              required
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || text.trim().length < 5}
          >
            {submitting ? t("common.loading") : t("productQa.submit")}
          </button>
        </form>
      ) : (
        <p className="text-sm text-text-muted">
          {t("productQa.signInToAsk")}{" "}
          <Link to="/account" className="text-accent hover:underline">
            {t("auth.signIn")}
          </Link>
        </p>
      )}
    </section>
  );
}
