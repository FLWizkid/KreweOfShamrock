import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Flushes public.outbound_emails via Resend.
 * Safe no-op when RESEND_API_KEY is unset (queues stay queued).
 * Auth: optional x-cron-secret when CRON_SECRET is set; otherwise open to invoke
 * (service role used server-side only). JWT verify left off for cron.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

type OutboundRow = {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  body_html: string;
  attempts: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST" && req.method !== "GET") {
    return json({ ok: false, message: "POST or GET only" }, 405);
  }

  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  if (cronSecret) {
    const got = req.headers.get("x-cron-secret") || "";
    if (got !== cronSecret) {
      return json({ ok: false, message: "Unauthorized" }, 401);
    }
  }

  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  if (!resendKey) {
    return json({
      ok: true,
      skipped: true,
      message: "RESEND_API_KEY is not set. Queued emails were left untouched.",
    });
  }

  const from =
    Deno.env.get("RESEND_FROM") ||
    "Krewe of Shamrock <onboarding@resend.dev>";
  const url = Deno.env.get("SUPABASE_URL") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !service) {
    return json({ ok: false, message: "Supabase env missing" }, 500);
  }

  const admin = createClient(url, service);
  const limit = 40;

  const { data: rows, error: selErr } = await admin
    .from("outbound_emails")
    .select("id,to_email,to_name,subject,body_html,attempts")
    .eq("status", "queued")
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (selErr) {
    return json({ ok: false, message: selErr.message }, 500);
  }

  const batch = (rows || []) as OutboundRow[];
  if (!batch.length) {
    return json({ ok: true, processed: 0, sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of batch) {
    await admin
      .from("outbound_emails")
      .update({ status: "sending", attempts: (row.attempts || 0) + 1 })
      .eq("id", row.id);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [row.to_name ? `${row.to_name} <${row.to_email}>` : row.to_email],
          subject: row.subject,
          html: row.body_html,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg =
          (payload && (payload.message || payload.error)) ||
          `Resend HTTP ${res.status}`;
        const attempts = (row.attempts || 0) + 1;
        await admin
          .from("outbound_emails")
          .update({
            status: attempts >= 3 ? "failed" : "queued",
            error: String(errMsg).slice(0, 500),
          })
          .eq("id", row.id);
        failed += 1;
        continue;
      }
      await admin
        .from("outbound_emails")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", row.id);
      sent += 1;
    } catch (e) {
      const attempts = (row.attempts || 0) + 1;
      await admin
        .from("outbound_emails")
        .update({
          status: attempts >= 3 ? "failed" : "queued",
          error: String((e as Error)?.message || e).slice(0, 500),
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return json({
    ok: true,
    processed: batch.length,
    sent,
    failed,
  });
});
