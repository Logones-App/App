import { createClient } from "@/lib/supabase/server";

export interface ServerUser {
  id: string;
  email: string;
  role: string | null;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Priorité : app_metadata, puis user_metadata, puis users_organizations
    let role =
      (user.app_metadata.role as string | undefined) ?? (user.user_metadata.role as string | undefined) ?? null;

    if (!role) {
      const { data: orgRow } = await supabase
        .from("users_organizations")
        .select("role")
        .eq("user_id", user.id)
        .eq("deleted", false)
        .maybeSingle();
      role = orgRow?.role ?? null;
    }

    return {
      id: user.id,
      email: user.email ?? "",
      role,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    };
  } catch {
    return null;
  }
}

export async function getServerUserRole(): Promise<string | null> {
  const user = await getServerUser();
  return user?.role ?? null;
}
