import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fetchSupportFaq,
  fetchSupportMessages,
  openSupportThread,
  postSupportMessage,
} from "../api/client";
import { isFlagEnabled, loadFeatureFlags } from "../lib/featureFlags";

type Props = { orderId: string };

export function OrderSupportChat({ orderId }: Props) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(isFlagEnabled("supportChat") || isFlagEnabled("chat"));
  const [faq, setFaq] = useState<{ id: string; question: string; answer: string }[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; body: string; senderRole: string; createdAt: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadFeatureFlags().then((f) => setEnabled(f.supportChat || f.chat));
    fetchSupportFaq().then(setFaq);
  }, []);

  useEffect(() => {
    if (!threadId) return;
    fetchSupportMessages(threadId).then(setMessages);
  }, [threadId]);

  if (!enabled) {
    return (
      <div className="card p-5 sm:p-6 mt-5">
        <h2 className="text-lg font-bold">{t("support.faqTitle")}</h2>
        <ul className="mt-3 space-y-3">
          {faq.map((item) => (
            <li key={item.id}>
              <p className="text-sm font-semibold">{item.question}</p>
              <p className="text-sm text-text-muted mt-1">{item.answer}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6 mt-5">
      <h2 className="text-lg font-bold">{t("support.chatTitle")}</h2>
      <p className="text-sm text-text-muted mt-1">{t("support.chatHint")}</p>

      <details className="mt-4">
        <summary className="text-sm font-semibold cursor-pointer">{t("support.faqTitle")}</summary>
        <ul className="mt-3 space-y-3">
          {faq.map((item) => (
            <li key={item.id}>
              <p className="text-sm font-semibold">{item.question}</p>
              <p className="text-sm text-text-muted mt-1">{item.answer}</p>
            </li>
          ))}
        </ul>
      </details>

      {!threadId ? (
        <button
          type="button"
          className="btn-secondary mt-4 min-h-[44px]"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const thread = await openSupportThread(orderId);
            if (thread?.id) setThreadId(thread.id);
            setBusy(false);
          }}
        >
          {t("support.startChat")}
        </button>
      ) : (
        <div className="mt-4">
          <ul className="max-h-56 overflow-y-auto space-y-2 border border-border rounded-xl p-3 bg-muted/40">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`text-sm ${m.senderRole === "customer" ? "text-right" : "text-left"}`}
              >
                <span
                  className={`inline-block rounded-xl px-3 py-2 ${
                    m.senderRole === "customer" ? "bg-accent text-white" : "bg-white border border-border"
                  }`}
                >
                  {m.body}
                </span>
              </li>
            ))}
          </ul>
          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!draft.trim() || !threadId) return;
              setBusy(true);
              const ok = await postSupportMessage(threadId, draft.trim());
              if (ok) {
                setDraft("");
                setMessages(await fetchSupportMessages(threadId));
              }
              setBusy(false);
            }}
          >
            <input
              className="flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("support.messagePlaceholder")}
            />
            <button type="submit" className="btn-primary min-h-[44px] px-4" disabled={busy}>
              {t("support.send")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
