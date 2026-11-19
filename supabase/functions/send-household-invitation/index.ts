import nodemailer from "npm:nodemailer@10.6.0";

const appUrl = "https://zefad3v.github.io/wachochemer/prototype/";
const cors = {
  "Access-Control-Allow-Origin": new URL(appUrl).origin,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const mailbox = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

function respond(status: number, body: object) {
  return Response.json(body, { status, headers: cors });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return respond(405, { code: "method" });

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return respond(401, { code: "auth" });

  const input = await request.json().catch(() => null);
  const { householdId, invitationId } = input ?? {};
  if (typeof householdId !== "string" || !uuid.test(householdId) ||
      typeof invitationId !== "string" || !uuid.test(invitationId)) {
    return respond(400, { code: "invalid" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const user = Deno.env.get("INVITE_SMTP_USERNAME");
  const pass = Deno.env.get("INVITE_SMTP_PASSWORD");
  const from = Deno.env.get("INVITE_SMTP_FROM") || user;
  if (!url || !anonKey || !serviceKey || !user || !pass || !from || !mailbox.test(from)) {
    return respond(503, { code: "unavailable" });
  }

  // PostgREST validates the caller's JWT. The reservation RPC enforces membership and MFA.
  const rpc = (method: string, key: string, auth: string, body: object) =>
    fetch(url + "/rest/v1/rpc/" + method, {
      method: "POST",
      headers: { apikey: key, Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

  try {
    const reservation = await rpc("reserve_household_invitation_mail", anonKey, authorization, {
      target: householdId, invitation: invitationId,
    });
    if (!reservation.ok) {
      if (reservation.status === 429) return respond(429, { code: "wait" });
      if ([401, 403, 404].includes(reservation.status)) return respond(reservation.status, { code: "unavailable" });
      return respond(503, { code: "unavailable" });
    }
    const { email, attempt_at } = await reservation.json();
    if (typeof email !== "string" || email.length > 254 || !mailbox.test(email)) {
      return respond(422, { code: "invalid_email" });
    }

    const link = new URL(appUrl);
    link.searchParams.set("invite", invitationId);
    const smtp = nodemailer.createTransport({
      host: "mail.infomaniak.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
    const result = await smtp.sendMail({
      from: { name: "Wa chochemer?", address: from },
      to: { name: "", address: email },
      envelope: { from, to: [email] },
      subject: "Wa chochemer? Du bisch iiglade",
      text: `Hoi!

Mit däm Link chasch em gemeinsame Haushalt biiträte:
${link.href}

Meld di mit däre E-Mail-Adresse aa oder erstell es Konto. Falls du kei Iiladig erwartet hesch, chasch die E-Mail ignoriere.`,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    if (result.accepted.length !== 1) return respond(503, { code: "unavailable" });

    // A failed status write must not turn an accepted mail into a resend prompt.
    const confirmed = await rpc("confirm_household_invitation_mail", serviceKey, "Bearer " + serviceKey, {
      invitation: invitationId, attempt_at,
    }).then((response) => response.ok, () => false);
    if (!confirmed) console.error("Invitation mail accepted but confirmation could not be saved");
    return respond(200, { sent: true });
  } catch {
    console.error("Household invitation mail request failed");
    return respond(503, { code: "unavailable" });
  }
});
