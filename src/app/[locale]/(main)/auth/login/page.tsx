import Link from "next/link";

import { Command } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { LoginFormV1 } from "./_components/login-form";

export default function LoginV1() {
  const t = useTranslations("auth.login");

  return (
    <div className="flex h-dvh">
      <div className="bg-primary hidden lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <Command className="text-primary-foreground mx-auto size-12" />
            <div className="space-y-2">
              <h1 className="text-primary-foreground text-5xl font-light">{t("welcome_message")}</h1>
              <p className="text-primary-foreground/80 text-xl">{t("login_to_continue")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10 py-24 lg:py-32">
          <div className="space-y-4 text-center">
            <div className="text-foreground font-medium tracking-tight">{t("title")}</div>
            <div className="text-muted-foreground mx-auto max-w-xl">{t("subtitle")}</div>
          </div>
          <div className="space-y-4">
            <LoginFormV1 />
            <Button className="w-full" variant="outline">
              {t("continue_with_google")}
            </Button>
            <p className="text-muted-foreground text-center text-xs font-medium">
              {t("no_account")}{" "}
              <Link href="register" className="text-primary font-semibold">
                {t("create_account")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
