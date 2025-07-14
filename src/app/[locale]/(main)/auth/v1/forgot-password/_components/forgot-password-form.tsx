"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const FormSchema = z.object({
  email: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
});

export function ForgotPasswordForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/v1/reset-password`,
      });

      if (error) {
        console.error("Reset password error:", error);
        toast.error("Erreur lors de l'envoi de l'email. Veuillez réessayer.");
      } else {
        toast.success("Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.");
        form.reset();
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("Erreur lors de l'envoi de l'email. Veuillez réessayer.");
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
              <FormLabel>Adresse email</FormLabel>
              <FormControl>
                <Input id="email" type="email" placeholder="votre@email.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit">
          Envoyer le lien de réinitialisation
        </Button>

        <div className="text-muted-foreground text-center text-sm">
          <Link href="/auth/v1/login" className="text-primary font-medium hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </form>
    </Form>
  );
}
