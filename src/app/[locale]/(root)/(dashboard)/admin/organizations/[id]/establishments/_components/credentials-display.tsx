"use client";

import { useState } from "react";

import { AlertTriangle, Check, CheckCircle2, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CredentialsDisplay({ email, password }: { email: string; password: string }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  function copy(text: string, setCopied: (v: boolean) => void) {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const qrContent = JSON.stringify({ email, password });
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrContent)}&margin=10`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-700 dark:bg-green-950/30 dark:text-green-300">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">Établissement créé avec succès</p>
      </div>
      <div className="space-y-2">
        <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">Identifiants tablette</p>
        <div className="flex justify-center rounded-lg border bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR code identifiants tablette" width={200} height={200} />
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-muted-foreground min-w-14 text-xs font-medium">Email</span>
          <span className="flex-1 font-mono text-xs break-all">{email}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copy(email, setCopiedEmail)}>
            {copiedEmail ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <span className="text-muted-foreground min-w-14 text-xs font-medium">Password</span>
          <span className="flex-1 font-mono text-xs break-all">{password}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copy(password, setCopiedPwd)}>
            {copiedPwd ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Ces identifiants ne seront plus affichés après fermeture. Scannez le QR code ou notez-les maintenant.</p>
      </div>
    </div>
  );
}
