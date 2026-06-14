"use client";

import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

function getPasswordErrorMessage(msg: string): string {
  if (msg.includes("different from the old password") || msg.includes("same as the old password"))
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  if (msg.includes("at least") || msg.includes("too short"))
    return "Le mot de passe doit contenir au moins 8 caractères.";
  if (msg.includes("too weak") || msg.includes("weak"))
    return "Le mot de passe est trop faible. Ajoutez des chiffres ou des caractères spéciaux.";
  if (msg.includes("session") || msg.includes("Auth session missing"))
    return "Session expirée. Redemandez un lien d'invitation.";
  return msg;
}

const FormSchema = z
  .object({
    password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
    confirmPassword: z
      .string()
      .min(8, { message: "La confirmation du mot de passe doit contenir au moins 8 caractères." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export function ResetPasswordForm() {
  const router = useRouter();
  const t = useTranslations("common");
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const supabase = createClient();

    // Parser le hash manuellement pour récupérer les tokens Supabase
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    const error = params.get("error");
    const errorCode = params.get("error_code");

    if (error) {
      const msg =
        errorCode === "otp_expired"
          ? "Ce lien a expiré (valable 1 heure). Demandez un nouveau lien d'invitation."
          : "Lien invalide. Demandez un nouveau lien d'invitation.";
      setLinkError(msg);
      setChecking(false);
      return;
    }

    if (accessToken && refreshToken && type === "recovery") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error: sessErr }) => {
          if (!sessErr && data.session) setSessionReady(true);
        })
        .catch(() => {})
        .finally(() => setChecking(false));
      return;
    }

    // Fallback : session déjà établie
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) setSessionReady(true);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        console.error("Update password error:", error);
        const msg = getPasswordErrorMessage(error.message);
        toast.error(msg);
      } else {
        toast.success("Mot de passe défini avec succès !");
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Update password error:", error);
      toast.error("Une erreur inattendue est survenue.");
    }
  };

  if (checking) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <p className="text-muted-foreground text-sm">Vérification du lien…</p>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-destructive text-sm">{linkError}</p>
        <Link href="/auth/login" className="text-primary text-sm font-medium hover:underline">
          {t("back_to_login")}
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("password_label")}</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder={t("password_placeholder")}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("confirm_password_label")}</FormLabel>
              <FormControl>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t("confirm_password_placeholder")}
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={form.formState.isSubmitting || !sessionReady}>
          {form.formState.isSubmitting ? t("loading") : t("resetButton")}
        </Button>

        <div className="text-muted-foreground text-center text-sm">
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            {t("back_to_login")}
          </Link>
        </div>
      </form>
    </Form>
  );
}
