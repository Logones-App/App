import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Récupérer l'utilisateur actuel
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Vérifier si c'est un system_admin
    const systemRole = user.app_metadata?.role ?? user.user_metadata?.role;

    if (systemRole !== "system_admin") {
      return NextResponse.json({ error: "Unauthorized - System admin required" }, { status: 403 });
    }

    // Récupérer tous les utilisateurs
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Erreur lors de la récupération des utilisateurs:", usersError);
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }

    // Filtrer et formater les données utilisateur
    const formattedUsers = users.users.map((user) => ({
      id: user.id,
      email: user.email,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      role: user.app_metadata?.role ?? user.user_metadata?.role ?? null,
      permissions: user.app_metadata?.permissions ?? [],
      features: user.app_metadata?.features ?? [],
      subscription_tier: user.app_metadata?.subscription_tier || "free",
      access_level: user.app_metadata?.access_level || "user",
    }));

    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length,
    });
  } catch (error) {
    console.error("API Admin Users - Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
