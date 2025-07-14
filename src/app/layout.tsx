import { ReactNode } from "react";
import type { Metadata } from "next";
import { APP_CONFIG } from "@/config/app-config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_CONFIG.meta.title,
  description: APP_CONFIG.meta.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
