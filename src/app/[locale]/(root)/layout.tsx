import { ReactNode } from "react";

import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
