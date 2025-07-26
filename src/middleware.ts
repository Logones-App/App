import { NextRequest } from "next/server";

import { authMiddleware } from "./middleware/auth-middleware";

// Point d'entrée du middleware - respecte l'architecture existante
export default async function middleware(req: NextRequest) {
  return await authMiddleware(req);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
