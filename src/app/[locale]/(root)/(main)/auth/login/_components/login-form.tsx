"use client";

import { Link, useRouter } from "@/i18n/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/lib/queries/auth";
import { useAuthStore } from "@/lib/stores/auth-store";

const FormSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
  remember: z.boolean().optional(),
});

export function LoginFormV1() {
  const router = useRouter();
  const loginMutation = useLogin();
  const { setUser, user, isAuthenticated } = useAuthStore();
  const t = useTranslations("auth.login");
  const tv = useTranslations("auth.validation");

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      const result = await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });

      setUser(result.user);
      toast.success(t("success"));

      // Attendre un peu pour que l'état soit mis à jour
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Récupérer le rôle directement
      const response = await fetch("/api/auth/roles", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const roleData = await response.json();
        console.log("🔍 Rôle récupéré:", roleData);

        if (roleData.role === "system_admin") {
          console.log("✅ System admin détecté - redirection vers /admin");
          router.push("/admin");
        } else if (roleData.role === "org_admin") {
          console.log("✅ Org admin détecté - redirection vers /dashboard");
          router.push("/dashboard");
        } else {
          console.log("⚠️ Aucun rôle valide trouvé - redirection vers /unauthorized");
          router.push("/unauthorized");
        }
      } else {
        console.log("❌ Erreur lors de la récupération du rôle");
        router.push("/unauthorized");
      }
    } catch (error: any) {
      console.error("Login error:", error);

      // Messages d'erreur plus spécifiques
      if (error?.message?.includes("Invalid login credentials")) {
        toast.error(t("errors.invalid_credentials"));
      } else if (error?.message?.includes("Email not confirmed")) {
        toast.error(t("errors.email_not_confirmed"));
      } else {
        toast.error(t("errors.generic"));
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email_label")}</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("email_placeholder")}
                  autoComplete="email"
                  disabled={loginMutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="remember"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    id="login-remember"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={loginMutation.isPending}
                    className="size-4"
                  />
                </FormControl>
                <FormLabel htmlFor="login-remember" className="text-muted-foreground text-sm font-medium">
                  {t("remember_me")}
                </FormLabel>
              </div>
              <Link href="/auth/forgot-password" className="text-primary text-sm font-medium hover:underline">
                {t("forgot_password")}
              </Link>
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              {t("login_loading")}
            </>
          ) : (
            t("login_button")
          )}
        </Button>

        <div className="text-muted-foreground text-center text-sm">
          {t("no_account")}{" "}
          <Link href="/auth/register" className="text-primary font-medium hover:underline">
            {t("create_account")}
          </Link>
        </div>
      </form>
    </Form>
  );
}
