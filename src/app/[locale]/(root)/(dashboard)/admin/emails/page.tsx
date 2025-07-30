"use client";

import React, { useState, useEffect } from "react";

import { Send, AlertCircle, Trash2, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { ActionButtons } from "./_components/action-buttons";
import { EmailLogs } from "./_components/email-logs";
import { EmailStats } from "./_components/email-stats";
import { EmailTests } from "./_components/email-tests";

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template_name: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
  booking_id: string | null;
  organization_id: string | null;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export default function EmailsManagementPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [cleaningLogs, setCleaningLogs] = useState(false);
  const [testingEmail, setTestingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger les logs d'emails
  const loadEmailLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/email/logs");
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setStats(data.stats);
      } else {
        setError(data.error ?? "Erreur lors du chargement des logs");
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement des logs:", error);
      setError("Erreur lors du chargement des logs");
    } finally {
      setLoading(false);
    }
  };

  // Envoyer les rappels automatiques
  const sendReminders = async () => {
    try {
      setSendingReminders(true);
      const response = await fetch("/api/email/reminders", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        console.log("✅ Rappels envoyés:", data);
        await loadEmailLogs();
      } else {
        setError(data.error ?? "Erreur lors de l'envoi des rappels");
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi des rappels:", error);
      setError("Erreur lors de l'envoi des rappels");
    } finally {
      setSendingReminders(false);
    }
  };

  // Nettoyer les anciens logs
  const cleanOldLogs = async () => {
    try {
      setCleaningLogs(true);
      const response = await fetch("/api/email/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ daysToKeep: 30 }),
      });
      const data = await response.json();

      if (data.success) {
        console.log("✅ Logs nettoyés:", data);
        await loadEmailLogs();
      } else {
        setError(data.error ?? "Erreur lors du nettoyage des logs");
      }
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage des logs:", error);
      setError("Erreur lors du nettoyage des logs");
    } finally {
      setCleaningLogs(false);
    }
  };

  // Tester l'envoi d'email de confirmation
  const testConfirmationEmail = async () => {
    try {
      setTestingEmail("confirmation");
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "confirmation",
          data: {
            customerName: "Jean Dupont",
            customerEmail: "contact@la-plank-des-gones.fr",
            establishmentName: "La Plank des Gones",
            reservationDate: "15/01/2024",
            reservationTime: "19:30",
            numberOfGuests: 4,
            specialRequests: "Table près de la fenêtre",
            bookingId: "test-booking-123",
            establishmentAddress: "123 Rue de la Gastronomie, Lyon",
            establishmentPhone: "04 78 12 34 56",
            establishmentEmail: "contact@la-plank-des-gones.fr",
          },
        }),
      });
      const data = await response.json();

      if (data.success) {
        console.log("✅ Email de confirmation testé:", data);
        await loadEmailLogs();
      } else {
        setError(data.error ?? "Erreur lors du test de l'email de confirmation");
      }
    } catch (error) {
      console.error("❌ Erreur lors du test de l'email de confirmation:", error);
      setError("Erreur lors du test de l'email de confirmation");
    } finally {
      setTestingEmail(null);
    }
  };

  // Tester l'envoi d'email de notification établissement
  const testNotificationEmail = async () => {
    try {
      setTestingEmail("notification");
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "notification",
          data: {
            customerName: "Marie Martin",
            customerEmail: "contact@la-plank-des-gones.fr",
            establishmentName: "La Plank des Gones",
            establishmentEmail: "contact@la-plank-des-gones.fr",
            reservationDate: "16/01/2024",
            reservationTime: "20:00",
            numberOfGuests: 2,
            specialRequests: "Anniversaire",
            bookingId: "test-booking-456",
            establishmentAddress: "123 Rue de la Gastronomie, Lyon",
            establishmentPhone: "04 78 12 34 56",
          },
        }),
      });
      const data = await response.json();

      if (data.success) {
        console.log("✅ Email de notification testé:", data);
        await loadEmailLogs();
      } else {
        setError(data.error ?? "Erreur lors du test de l'email de notification");
      }
    } catch (error) {
      console.error("❌ Erreur lors du test de l'email de notification:", error);
      setError("Erreur lors du test de l'email de notification");
    } finally {
      setTestingEmail(null);
    }
  };

  // Tester l'envoi d'email de rappel
  const testReminderEmail = async () => {
    try {
      setTestingEmail("reminder");
      const response = await fetch("/api/email/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "reminder",
          data: {
            customerName: "Pierre Durand",
            customerEmail: "contact@la-plank-des-gones.fr",
            establishmentName: "La Plank des Gones",
            reservationDate: "17/01/2024",
            reservationTime: "19:00",
            numberOfGuests: 6,
            specialRequests: "Table d&apos;extérieur si possible",
            bookingId: "test-booking-789",
            establishmentAddress: "123 Rue de la Gastronomie, Lyon",
            establishmentPhone: "04 78 12 34 56",
            establishmentEmail: "contact@la-plank-des-gones.fr",
          },
        }),
      });
      const data = await response.json();

      if (data.success) {
        console.log("✅ Email de rappel testé:", data);
        await loadEmailLogs();
      } else {
        setError(data.error ?? "Erreur lors du test de l'email de rappel");
      }
    } catch (error) {
      console.error("❌ Erreur lors du test de l'email de rappel:", error);
      setError("Erreur lors du test de l'email de rappel");
    } finally {
      setTestingEmail(null);
    }
  };

  useEffect(() => {
    loadEmailLogs();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des emails</h1>
          <p className="text-muted-foreground">Surveillez et gérez l&apos;envoi d&apos;emails</p>
        </div>
        <ActionButtons
          sendReminders={sendReminders}
          sendingReminders={sendingReminders}
          cleanOldLogs={cleanOldLogs}
          cleaningLogs={cleaningLogs}
        />
      </div>

      {/* Erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tests d'emails */}
      <EmailTests
        testConfirmationEmail={testConfirmationEmail}
        testNotificationEmail={testNotificationEmail}
        testReminderEmail={testReminderEmail}
        testingEmail={testingEmail}
      />

      {/* Statistiques */}
      <EmailStats stats={stats} />

      {/* Logs d'emails */}
      <EmailLogs logs={logs} />
    </div>
  );
}
