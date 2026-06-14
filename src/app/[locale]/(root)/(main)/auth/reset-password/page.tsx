import { KeyRound } from "lucide-react";

import { ResetPasswordForm } from "./_components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex h-dvh">
      <div className="bg-primary hidden lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <KeyRound className="text-primary-foreground mx-auto size-12" />
            <div className="space-y-2">
              <h1 className="text-primary-foreground text-4xl font-light">Logones</h1>
              <p className="text-primary-foreground/80 text-lg">
                Définissez votre mot de passe pour accéder à votre espace.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background flex w-full items-center justify-center p-8 lg:w-2/3">
        <div className="w-full max-w-md space-y-10">
          <div className="space-y-2 text-center">
            <h2 className="text-foreground text-2xl font-semibold tracking-tight">Réinitialiser le mot de passe</h2>
            <p className="text-muted-foreground text-sm">Choisissez un mot de passe d&apos;au moins 8 caractères.</p>
          </div>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
