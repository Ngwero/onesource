/**
 * Thin product Q&A foundation. No scraped content — shopper questions only.
 * Degrades gracefully when product_questions table is missing.
 */

function isMissingQaTable(error) {
  const code = String(error?.code ?? "");
  const msg = String(error?.message ?? error ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (msg.includes("product_questions") &&
      (msg.includes("does not exist") ||
        msg.includes("schema cache") ||
        msg.includes("could not find")))
  );
}

export async function listProductQuestions(db, productId, { limit = 20 } = {}) {
  try {
    const { data, error } = await db
      .from("product_questions")
      .select("id, product_id, question, answer, answered_at, created_at")
      .eq("product_id", productId)
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(Math.min(50, Math.max(1, limit)));
    if (error) {
      if (isMissingQaTable(error)) return [];
      throw error;
    }
    return data ?? [];
  } catch (error) {
    if (isMissingQaTable(error)) return [];
    throw error;
  }
}

export async function askProductQuestion(db, { productId, userId, question }) {
  const text = String(question ?? "").trim();
  if (!productId || !userId) {
    return { error: "Authentication and productId are required", status: 400 };
  }
  if (text.length < 5 || text.length > 1000) {
    return { error: "Question must be 5–1000 characters", status: 400 };
  }
  try {
    const { data, error } = await db
      .from("product_questions")
      .insert({
        product_id: productId,
        user_id: userId,
        question: text,
        moderation_status: "approved",
      })
      .select("id, product_id, question, answer, answered_at, created_at")
      .single();
    if (error) {
      if (isMissingQaTable(error)) {
        return { error: "Product Q&A is not enabled yet", status: 503 };
      }
      throw error;
    }
    return { question: data };
  } catch (error) {
    if (isMissingQaTable(error)) {
      return { error: "Product Q&A is not enabled yet", status: 503 };
    }
    throw error;
  }
}
