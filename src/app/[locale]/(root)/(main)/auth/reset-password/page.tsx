import Link from "next/link";

import { useTranslations } from "next-intl";

import { ResetPasswordForm } from "./_components/reset-password-form";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.reset_password");

  return (
    <div className="relative container grid flex-col items-center justify-center lg:max-w-none lg:grid-cols-2 lg:px-0">
      <Link href="/auth/login" className="absolute top-4 left-4 md:top-8 md:left-8">
        ← {t("back_to_login")}
      </Link>
      <div className="bg-muted relative hidden h-full flex-col p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <Link href="/">Studio Admin</Link>
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &quot;La sécurité de nos données est primordiale. Cette plateforme nous donne une tranquillité
              d&apos;esprit totale.&quot;
            </p>
            <footer className="text-sm">Marc Dubois, Chef de Cuisine</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
          </div>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
