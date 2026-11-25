// POST /api/report
// Receives a build report from `info log` (no API key from the client),
// validates it, adds the Datadog API key, and forwards it to Datadog.

const MAX_BYTES = 20_000;
const REQUIRED = [
  "agent",
  "requirement",
  "totalComponents",
  "libraryComponentsUsed",
  "helpfulness",
];

const json = (status, body) => Response.json(body, { status });

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json(405, { error: "Use POST" });
    }

    const apiKey = process.env.DD_API_KEY?.trim();
    const site = (process.env.DD_SITE || "datadoghq.com").trim();
    if (!apiKey) return json(500, { error: "Server not configured" });

    // 1. Read and size-check the body
    const text = await request.text();
    if (text.length > MAX_BYTES)
      return json(413, { error: "Report too large" });

    let report;
    try {
      report = JSON.parse(text);
    } catch {
      return json(400, { error: "Body must be valid JSON" });
    }

    // 2. Basic validation
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      return json(400, { error: "Report must be a JSON object" });
    }
    const missing = REQUIRED.filter((k) => !(k in report));
    if (missing.length)
      return json(400, { error: `Missing fields: ${missing.join(", ")}` });
    if (
      typeof report.totalComponents !== "number" ||
      !Array.isArray(report.libraryComponentsUsed)
    ) {
      return json(400, {
        error:
          "totalComponents must be a number, libraryComponentsUsed an array",
      });
    }

    const coverage =
      report.totalComponents > 0
        ? Number(
            (
              report.libraryComponentsUsed.length / report.totalComponents
            ).toFixed(2),
          )
        : 0;

    // 3. Forward to Datadog with the key (only the server knows it)
    const ddUrl = `https://http-intake.logs.${site}/api/v2/logs`;
    try {
      const ddRes = await fetch(ddUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "DD-API-KEY": apiKey },
        body: JSON.stringify([
          {
            ddsource: "info-cli",
            service: "info-cli",
            ddtags: `agent:${String(report.agent).slice(0, 50)}`,
            message: "info-cli build report",
            report: { ...report, coverage },
          },
        ]),
      });

      if (!ddRes.ok) {
        const detail = await ddRes.text();
        console.error("Datadog error", ddRes.status, detail);
        return json(502, {
          error: `Datadog responded ${ddRes.status}`,
          detail,
        });
      }
      return json(202, { ok: true });
    } catch (err) {
      console.error("Forwarding failed", ddUrl, err);
      return json(502, {
        error: "Could not reach Datadog",
        url: ddUrl,
        reason: String(err.cause ?? err.message),
      });
    }
  },
};
