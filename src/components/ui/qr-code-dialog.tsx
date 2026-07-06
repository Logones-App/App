"use client";

import { useState } from "react";

import { Check, Copy, Download, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function useClipboard() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return { copied, copy };
}

function qrImageUrl(url: string, size = 240) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&margin=10`;
}

export function QrCodeDialog({
  url,
  label = "QR Code",
  description,
  title = "Carte client numérique",
  downloadName = "qrcode-menu.png",
  footer = "Imprimez ce QR code et placez-le sur vos tables. Vos clients accèdent directement à votre carte.",
}: {
  url: string;
  label?: string;
  description?: string;
  title?: string;
  downloadName?: string;
  footer?: string;
}) {
  const { copied, copy } = useClipboard();
  const imgUrl = qrImageUrl(url);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = qrImageUrl(url, 600);
    a.download = downloadName;
    a.click();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/40 text-primary hover:bg-primary/5">
          <QrCode className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="rounded-xl border bg-white p-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl}
              alt="QR Code carte client"
              width={200}
              height={200}
              className="block"
            />
          </div>

          {/* URL avec copie */}
          <div className="w-full space-y-2">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Lien direct
            </p>
            <div className="flex gap-2">
              <Input value={url} readOnly className="text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copy(url)}
                title="Copier le lien"
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Télécharger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleDownload}
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger le QR Code (600×600)
          </Button>

          <p className="text-muted-foreground text-center text-xs">{footer}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
