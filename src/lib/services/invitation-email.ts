const SITE_URL = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const INVITATION_REDIRECT_URL = `${SITE_URL}/fr/auth/reset-password`;

export async function sendInvitationEmail(to: string, name: string, actionLink: string): Promise<boolean> {
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    console.error("sendInvitationEmail: BREVO_API_KEY manquant");
    return false;
  }

  const displayName = name.trim() || to;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": brevoApiKey },
      body: JSON.stringify({
        sender: { name: "Logones", email: process.env.EMAIL_FROM ?? "no-reply@logones.fr" },
        to: [{ email: to, name: displayName }],
        subject: "Votre accès à la plateforme Logones",
        htmlContent: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
            <h2>Bienvenue sur Logones</h2>
            <p>Bonjour ${displayName},</p>
            <p>Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
            <p style="text-align:center;margin:32px 0">
              <a href="${actionLink}" style="background:#18181b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
                Définir mon mot de passe
              </a>
            </p>
            <p style="color:#71717a;font-size:13px">Ce lien est valable 1 heure et ne peut être utilisé qu&apos;une seule fois.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("sendInvitationEmail Brevo error:", res.status, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error("sendInvitationEmail failed:", err);
    return false;
  }
}
