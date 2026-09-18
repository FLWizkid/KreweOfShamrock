import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Optional notice when a priced krewe event is published without its own
 * Zeffy link. Reads TICKET_URL_NOTIFY_URL and TICKET_URL_NOTIFY_TOKEN from
 * the function environment only. If either is missing, does nothing.
 * Never called from browser code. The webhook token is not returned.
 */

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200 });
  if (req.method !== "POST") return json({ ok: false }, 405);

  const notifyUrl = (Deno.env.get("TICKET_URL_NOTIFY_URL") || "").trim();
  const notifyToken = (Deno.env.get("TICKET_URL_NOTIFY_TOKEN") || "").trim();
  if (!notifyUrl || !notifyToken) {
    return json({
      ok: true,
      skipped: true,
      message: "Ticket URL notify is not configured.",
    });
  }

  const supabaseUrl = (Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const auth = req.headers.get("authorization") || "";
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !auth || !apikey) {
    return json({ ok: true, skipped: true, message: "Notify skipped." });
  }

  const can = await fetch(`${supabaseUrl}/rest/v1/rpc/can_manage_events`, {
    method: "POST",
    headers: {
      apikey,
      authorization: auth,
      "content-type": "application/json",
    },
    body: "{}",
  });
  const allowedText = (await can.text()).trim();
  if (!can.ok || allowedText !== "true") {
    return json({ ok: false, message: "Not authorized" }, 403);
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    return json({ ok: true, skipped: true });
  }

  const price = Number(body.ticket_price_cents);
  const status = typeof body.status === "string" ? body.status : "";
  const ticketUrl = typeof body.ticket_payment_url === "string"
    ? body.ticket_payment_url.trim()
    : "";
  const eventId = typeof body.event_id === "string" ? body.event_id : "";
  if (
    body.became_published !== true ||
    status !== "published" ||
    !(price > 0) ||
    ticketUrl !== "" ||
    !uuidRe.test(eventId)
  ) {
    return json({ ok: true, skipped: true });
  }

  const name = typeof body.name === "string" ? body.name.slice(0, 200) : "";
  const start = typeof body.start_time === "string" ? body.start_time.slice(0, 40) : "";
  const location = typeof body.location === "string" ? body.location.slice(0, 300) : "";

  try {
    const hook = await fetch(notifyUrl, {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${notifyToken}`,
      },
      body: JSON.stringify({
        source: "krewe-event-studio",
        reason: "needs_own_ticket_url",
        event_id: eventId,
        name,
        start_time: start,
        location,
        ticket_price_cents: Math.round(price),
        status: "published",
      }),
    });
    return json({ ok: true, notified: hook.status >= 200 && hook.status < 300 });
  } catch {
    return json({ ok: true, notified: false });
  }
});
