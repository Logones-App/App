import { ReactNode } from "react";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="bg-background min-h-screen">
      {/* Header public sera dans chaque page pour personnalisation par restaurant */}
      <main className="flex-1">{children}</main>
      {/* Footer public sera dans chaque page pour personnalisation par restaurant */}
    </div>
  );
}
