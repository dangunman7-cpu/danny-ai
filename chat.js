const SYSTEM = "You are Danny Ai, a capable, friendly general-purpose assistant. Do the task the person asks for (essays, homework help, emails, summaries, brainstorming, code, questions about attached images, and so on) fully and well. Write in plain text without markdown symbols like ** or ##, using normal paragraphs and simple lists when needed. Ask a brief question only if the request is truly unclear.";

const json = (code, obj) => ({ statusCode: code, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Use POST" });

  const pass = process.env.SITE_PASSWORD;
  if (pass && event.headers["x-pass"] !== pass) return json(401, { error: "Wrong password" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "Bad request" }); }
  if (body.check) return json(200, { ok: true });

  const key = process.env.AI_API_KEY;
  if (!key) return json(500, { error: "AI_API_KEY is not set in Netlify" });
  const base = (process.env.AI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gemini-3.8-flash";

  const history = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (!history.length) return json(400, { error: "No messages" });

  try {
    const r = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + key },
      body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "system", content: SYSTEM }, ...history] })
    });
    const data = await r.json();
    if (!r.ok) {
      const d = Array.isArray(data) ? data[0] : data;
      return json(r.status, { error: (d && d.error && d.error.message) || "AI service error (" + r.status + ")" });
    }
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return json(200, { text: text || "(No reply)" });
  } catch (e) {
    return json(502, { error: "Could not reach the AI service" });
  }
};
