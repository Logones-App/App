"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRegister } from "@/lib/queries/auth";
import { useAuthStore } from "@/lib/stores/auth-store";

const FormSchema = z
  .object({
    email: z.string().email({ message: "Veuillez entrer une adresse email valide." }),
    password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères." }),
    confirmPassword: z
      .string()
      .min(8, { message: "La confirmation du mot de passe doit contenir au moins 8 caractères." }),
    firstName: z.string().min(2, { message: "Le prénom est requis." }),
    lastName: z.string().min(2, { message: "Le nom est requis." }),
    organizationName: z.string().min(2, { message: "Le nom de l'organisation est requis." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export function RegisterFormV1() {
  const router = useRouter();
  const registerMutation = useRegister();
  const { setUser } = useAuthStore();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      organizationName: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      const result = await registerMutation.mutateAsync({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationName: data.organizationName,
      });

      setUser(result.user);
      toast.success("Compte créé avec succès ! Redirection...");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Register error:", error);

      // Messages d'erreur plus spécifiques
      if (error?.message?.includes("User already registered")) {
        toast.error("Un compte avec cet email existe déjà.");
      } else if (error?.message?.includes("Password should be at least")) {
        toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      } else if (error?.message?.includes("Invalid email")) {
        toast.error("Adresse email invalide.");
      } else {
        toast.error("Erreur lors de l'inscription. Veuillez réessayer.");
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Jean"
                    autoComplete="given-name"
                    disabled={registerMutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Dupont"
                    autoComplete="family-name"
                    disabled={registerMutation.isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adresse email</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  autoComplete="email"
                  disabled={registerMutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de l'organisation</FormLabel>
              <FormControl>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Mon Restaurant"
                  autoComplete="organization"
                  disabled={registerMutation.isPending}
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
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={registerMutation.isPending}
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
              <FormLabel>Confirmer le mot de passe</FormLabel>
              <FormControl>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={registerMutation.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
              Création...
            </>
          ) : (
            "Créer le compte"
          )}
        </Button>

        <div className="text-muted-foreground text-center text-sm">
          Déjà un compte ?{" "}
          <Link href="/auth/v1/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </div>
      </form>
    </Form>
  );
}
