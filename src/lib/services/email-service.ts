import { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import {
  generateBookingConfirmationText,
  generateEstablishmentNotificationText,
  generateBookingReminderText,
} from "./email-text-generators";

type Booking = Tables<"bookings">;
type Establishment = Tables<"establishments">;

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  bookingId?: string;
  organizationId?: string;
  templateName: string;
}

export interface BookingEmailData {
  booking: Booking;
  establishment: Establishment;
  customerName: string;
  customerEmail: string;
  reservationDate: string;
  reservationTime: string;
  numberOfGuests: number;
  specialRequests?: string;
}

class EmailService {
  private smtpConfig = {
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER!,
      pass: process.env.BREVO_SMTP_PASSWORD!,
    },
  };

  private fromEmail = process.env.EMAIL_FROM ?? "noreply@la-plank-des-gones.fr";

  /**
   * Envoyer un email de confirmation de réservation
   */
  async sendBookingConfirmationEmail(bookingData: BookingEmailData): Promise<boolean> {
    try {
      console.log("🔍 Tentative d'envoi d'email de confirmation pour:", bookingData.customerEmail);

      const subject = `Confirmation de réservation - ${bookingData.establishment.name}`;

      const html = await this.generateBookingConfirmationHTML(bookingData);
      const text = generateBookingConfirmationText(bookingData);

      const emailData: EmailData = {
        to: bookingData.customerEmail,
        subject,
        html,
        text,
        bookingId: bookingData.booking.id,
        organizationId: bookingData.booking.organization_id,
        templateName: "booking_confirmation",
      };

      // Envoyer l'email réel
      const success = await this.sendEmail(emailData);
      return success;
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email de confirmation:", error);
      return false;
    }
  }

  /**
   * Envoyer un email de notification à l'établissement
   */
  async sendEstablishmentNotificationEmail(bookingData: BookingEmailData): Promise<boolean> {
    try {
      console.log("🔍 Tentative d'envoi d'email de notification pour:", bookingData.establishment.email);

      if (!bookingData.establishment.email) {
        console.log("⚠️ Pas d'email configuré pour l'établissement");
        return false;
      }

      const subject = `Nouvelle réservation - ${bookingData.customerName}`;

      const html = await this.generateEstablishmentNotificationHTML(bookingData);
      const text = generateEstablishmentNotificationText(bookingData);

      const emailData: EmailData = {
        to: bookingData.establishment.email,
        subject,
        html,
        text,
        bookingId: bookingData.booking.id,
        organizationId: bookingData.booking.organization_id,
        templateName: "establishment_notification",
      };

      // Envoyer l'email réel
      const success = await this.sendEmail(emailData);
      return success;
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email de notification:", error);
      return false;
    }
  }

  /**
   * Envoyer un email de rappel 24h avant
   */
  async sendBookingReminderEmail(bookingData: BookingEmailData): Promise<boolean> {
    try {
      console.log("🔍 Tentative d'envoi d'email de rappel pour:", bookingData.customerEmail);

      const subject = `Rappel de réservation - ${bookingData.establishment.name}`;

      const html = await this.generateBookingReminderHTML(bookingData);
      const text = generateBookingReminderText(bookingData);

      const emailData: EmailData = {
        to: bookingData.customerEmail,
        subject,
        html,
        text,
        bookingId: bookingData.booking.id,
        organizationId: bookingData.booking.organization_id,
        templateName: "booking_reminder",
      };

      // Envoyer l'email réel
      const success = await this.sendEmail(emailData);
      return success;
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email de rappel:", error);
      return false;
    }
  }

  /**
   * Envoyer un email générique
   */
  private async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      // Log de l'email avant envoi
      await this.logEmail({
        recipient_email: emailData.to,
        subject: emailData.subject,
        template_name: emailData.templateName,
        status: "pending",
        booking_id: emailData.bookingId ?? null,
        organization_id: emailData.organizationId ?? null,
        created_by: null,
        error_message: null,
        retry_count: 0,
        sent_at: null,
      });

      // Importer nodemailer dynamiquement
      const nodemailer = await import("nodemailer");

      // Créer le transport SMTP
      const transporter = nodemailer.createTransport({
        host: this.smtpConfig.host,
        port: this.smtpConfig.port,
        secure: this.smtpConfig.secure,
        auth: {
          user: this.smtpConfig.auth.user,
          pass: this.smtpConfig.auth.pass,
        },
      });

      // Envoyer l'email
      const info = await transporter.sendMail({
        from: this.fromEmail,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });

      console.log("✅ Email envoyé avec succès à:", emailData.to);
      console.log("📧 Message ID:", info.messageId);

      // Mettre à jour le log avec succès
      await this.updateEmailLog(emailData.to, "sent", info.messageId, null);

      return true;
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email:", error);

      // Mettre à jour le log avec l'erreur
      await this.updateEmailLog(
        emailData.to,
        "failed",
        null,
        error instanceof Error ? error.message : "Erreur inconnue",
      );

      return false;
    }
  }

  private async readEmailTemplate(templateName: string): Promise<string> {
    try {
      const fs = await import("fs");
      const templateDir = "emails_templates";
      const templateFile = templateName + ".html";
      const templatePath = "./" + templateDir + "/" + templateFile;
      return fs.readFileSync(templatePath, "utf-8");
    } catch (error) {
      console.error("❌ Erreur lors de la lecture du template:", error);
      return "";
    }
  }

  /**
   * Remplacer les variables dans un template
   */
  private replaceTemplateVariables(template: string, data: BookingEmailData): string {
    let result = template;

    // Remplacer les variables simples
    result = result
      .replace(/\{\{customerName\}\}/g, data.customerName)
      .replace(/\{\{customerEmail\}\}/g, data.customerEmail)
      .replace(/\{\{reservationDate\}\}/g, data.reservationDate)
      .replace(/\{\{reservationTime\}\}/g, data.reservationTime)
      .replace(/\{\{numberOfGuests\}\}/g, data.numberOfGuests.toString())
      .replace(/\{\{specialRequests\}\}/g, data.specialRequests ?? "")
      .replace(/\{\{establishmentName\}\}/g, data.establishment.name)
      .replace(/\{\{establishmentAddress\}\}/g, data.establishment.address ?? "")
      .replace(/\{\{establishmentPhone\}\}/g, data.establishment.phone ?? "")
      .replace(/\{\{establishmentEmail\}\}/g, data.establishment.email ?? "");

    // Gérer les conditions {{#if}}
    result = this.processConditionalBlocks(result, data);

    return result;
  }

  /**
   * Traiter les blocs conditionnels {{#if}}
   */
  private processConditionalBlocks(template: string, data: BookingEmailData): string {
    // Regex pour capturer les blocs {{#if variable}} ... {{/if}}
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

    return template.replace(conditionalRegex, (match, variable, content) => {
      // Vérifier si la variable existe et n'est pas vide
      const value = this.getVariableValue(variable, data);
      const shouldShow = value && value !== "";

      if (shouldShow) {
        // Remplacer les variables dans le contenu du bloc
        return content.replace(/\{\{(\w+)\}\}/g, (varMatch: string, varName: string) => {
          return this.getVariableValue(varName, data) ?? "";
        });
      } else {
        // Supprimer le bloc si la condition n'est pas remplie
        return "";
      }
    });
  }

  /**
   * Obtenir la valeur d'une variable depuis les données
   */
  private getVariableValue(variable: string, data: BookingEmailData): string | undefined {
    const variableMap: Record<string, string | undefined> = {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      reservationDate: data.reservationDate,
      reservationTime: data.reservationTime,
      numberOfGuests: data.numberOfGuests.toString(),
      specialRequests: data.specialRequests,
      establishmentName: data.establishment.name,
      establishmentAddress: data.establishment.address ?? undefined,
      establishmentPhone: data.establishment.phone ?? undefined,
      establishmentEmail: data.establishment.email ?? undefined,
    };

    return variableMap[variable];
  }

  /**
   * Générer le HTML pour la confirmation de réservation
   */
  private async generateBookingConfirmationHTML(data: BookingEmailData): Promise<string> {
    const template = await this.readEmailTemplate("confirmation");
    return this.replaceTemplateVariables(template, data);
  }

  /**
   * Générer le HTML pour la notification à l'établissement
   */
  private async generateEstablishmentNotificationHTML(data: BookingEmailData): Promise<string> {
    const template = await this.readEmailTemplate("notification");
    return this.replaceTemplateVariables(template, data);
  }

  /**
   * Générer le HTML pour le rappel de réservation
   */
  private async generateBookingReminderHTML(data: BookingEmailData): Promise<string> {
    const template = await this.readEmailTemplate("reminder");
    return this.replaceTemplateVariables(template, data);
  }

  /**
   * Logger un email dans la base de données
   */
  private async logEmail(logData: {
    recipient_email: string;
    subject: string;
    template_name: string;
    status: string;
    booking_id: string | null;
    organization_id: string | null;
    created_by: string | null;
    error_message: string | null;
    retry_count: number;
    sent_at: string | null;
  }): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("email_logs").insert(logData);
    } catch (error) {
      console.error("❌ Erreur lors du log de l'email:", error);
    }
  }

  /**
   * Mettre à jour le statut d'un email dans les logs
   */
  private async updateEmailLog(
    recipientEmail: string,
    status: string,
    messageId?: string | null,
    errorMessage?: string | null,
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase
        .from("email_logs")
        .update({
          status,
          sent_at: status === "sent" ? new Date().toISOString() : null,
          error_message: errorMessage,
        })
        .eq("recipient_email", recipientEmail)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour du log d'email:", error);
    }
  }
}

export const emailService = new EmailService();
