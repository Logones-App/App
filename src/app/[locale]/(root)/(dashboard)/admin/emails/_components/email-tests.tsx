"use client";

import React from "react";

import { Mail, RefreshCw, TestTube } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface EmailTestsProps {
  testConfirmationEmail: () => void;
  testNotificationEmail: () => void;
  testReminderEmail: () => void;
  testingEmail: string | null;
}

export function EmailTests({
  testConfirmationEmail,
  testNotificationEmail,
  testReminderEmail,
  testingEmail,
}: EmailTestsProps) {
  const t = useTranslations("admin.emails");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          {t("tests.title")}
        </CardTitle>
        <CardDescription>{t("tests.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Button
            onClick={testConfirmationEmail}
            disabled={testingEmail === "confirmation"}
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
          >
            {testingEmail === "confirmation" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{t("tests.confirmation.title")}</span>
            <span className="text-muted-foreground text-xs">{t("tests.confirmation.description")}</span>
          </Button>

          <Button
            onClick={testNotificationEmail}
            disabled={testingEmail === "notification"}
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
          >
            {testingEmail === "notification" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{t("tests.notification.title")}</span>
            <span className="text-muted-foreground text-xs">{t("tests.notification.description")}</span>
          </Button>

          <Button
            onClick={testReminderEmail}
            disabled={testingEmail === "reminder"}
            variant="outline"
            className="h-auto flex-col gap-2 p-4"
          >
            {testingEmail === "reminder" ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{t("tests.reminder.title")}</span>
            <span className="text-muted-foreground text-xs">{t("tests.reminder.description")}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
