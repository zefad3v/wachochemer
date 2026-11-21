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
      from: { name: "Wa chochemer", address: from },
      to: { name: "", address: email },
      envelope: { from, to: [email] },
      subject: "Deine Einladung zu Wa chochemer",
      text: `Hallo!

Über diesen Link kannst du dem gemeinsamen Haushalt beitreten:
${link.href}

Melde dich mit dieser E-Mail-Adresse an oder erstelle ein Konto. Wenn du keine Einladung erwartet hast, kannst du diese E-Mail ignorieren.`,
      html: `<!doctype html>
<html lang="de-CH">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Du bist eingeladen</title>
</head>
<body style="margin:0;padding:0;background-color:#1d3129;color:#f2eee4;font-family:Arial,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Plant eure Mahlzeiten und sammelt eure Rezepte im gemeinsamen Kochbuch.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#1d3129;">
    <tr><td align="center" style="padding:32px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;">
        <tr><td style="padding-bottom:28px;">
          <img src="https://zefad3v.github.io/wachochemer/prototype/assets/icons/icon-192.png" width="64" height="64" alt="Kochtopf mit Kochlöffel" style="display:block;border:0;border-radius:16px;">
          <p style="margin:16px 0 0;color:#f2eee4;font-family:Georgia,serif;font-size:28px;line-height:1.2;font-weight:bold;">Wa chochemer</p>
        </td></tr>
        <tr><td style="padding:28px 24px;background-color:#293e32;border:1px solid #536651;border-radius:18px;">
          <h1 style="margin:0 0 20px;color:#f2eee4;font-family:Georgia,serif;font-size:32px;line-height:1.2;">Du bist eingeladen</h1>
          <p style="margin:0 0 12px;color:#f2eee4;font-size:16px;line-height:1.6;">Hallo!</p>
          <p style="margin:0 0 24px;color:#f2eee4;font-size:16px;line-height:1.6;">Tritt dem Haushalt bei, um gemeinsam zu planen, was auf den Tisch kommt.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#d8e8b4" style="border-radius:12px;">
            <a href="${link.href}" style="display:inline-block;padding:16px 24px;border:1px solid #d8e8b4;border-radius:12px;color:#1d3129;font-size:16px;line-height:1.4;font-weight:bold;text-decoration:none;">Einladung annehmen</a>
          </td></tr></table>
          <p style="margin:24px 0 0;color:#c0c8ba;font-size:14px;line-height:1.6;">Melde dich mit dieser E-Mail-Adresse an oder erstelle ein Konto.</p>
        </td></tr>
        <tr><td style="padding-top:24px;">
          <p style="margin:0 0 12px;color:#c0c8ba;font-size:13px;line-height:1.6;">Alternativ kannst du den <a href="${link.href}" style="color:#d8e8b4;">Einladungslink öffnen</a>.</p>
          <p style="margin:0;color:#c0c8ba;font-size:13px;line-height:1.6;">Wenn du keine Einladung erwartet hast, kannst du diese E-Mail ignorieren.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
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
  } catch (error) {
    console.error("Household invitation mail request failed", JSON.stringify({name:error.name, code:error.code, command:error.command, responseCode:error.responseCode}));
    return respond(503, { code: "unavailable" });
  }
});
