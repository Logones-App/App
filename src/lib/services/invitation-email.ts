const SITE_URL = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const INVITATION_REDIRECT_URL = `${SITE_URL}/fr/auth/reset-password`;

export async function sendInvitationEmail(to: string, name: string, actionLink: string): Promise<boolean> {
  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER!,
        pass: process.env.BREVO_SMTP_PASSWORD!,
      },
    });
    const displayName = name.trim() || to;
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? "noreply@logones.fr",
      to,
      subject: "Votre accès à la plateforme Logones",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>Bienvenue sur Logones</h2>
          <p>Bonjour ${displayName},</p>
          <p>Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
          <p style="text-align:center;margin:32px 0">
            <a href="${actionLink}" style="background:#18181b;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
              Définir mon mot de passe
            </a>
          </p>
          <p style="color:#71717a;font-size:13px">Ce lien est valable 24 heures.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("sendInvitationEmail failed:", err);
    return false;
  }
}
