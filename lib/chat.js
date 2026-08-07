"use strict";

const SYSTEM_PROMPT =
  "You are a helpful, knowledgeable AI assistant. Answer questions clearly and concisely. " +
  "You can help with general knowledge, writing, coding, math, brainstorming, and everyday tasks. " +
  "If you are unsure about something, say so instead of guessing. Match the user's language.";

async function runChat(cfg, history) {
  const { apiKey, baseUrl, model } = cfg;
  const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(90000),
    });
  } catch (err) {
    throw new Error("AI provider unreachable: " + err.message);
  }

  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j.error && j.error.message ? j.error.message : "";
    } catch {}
    throw new Error(`AI provider returned HTTP ${res.status}${detail ? " — " + detail : ""}`);
  }

  const data = await res.json();
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  return { content: (msg && msg.content) || "", usage: data.usage || null };
}

module.exports = { runChat };
