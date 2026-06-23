"use client";

import { useState } from "react";

import { useParams, useRouter } from "next/navigation";

import { Plus } from "lucide-react";

import { EstablishmentsShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/establishments-shared";
import { Button } from "@/components/ui/button";

import { CreateEstablishmentModal } from "./_components/create-establishment-modal";

export default function OrganizationEstablishmentsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end px-6 pt-6">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un établissement
        </Button>
      </div>
      <EstablishmentsShared organizationId={organizationId} />
      <CreateEstablishmentModal
        open={showCreate}
        organizationId={organizationId}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          router.refresh();
        }}
      />
    </div>
  );
}
