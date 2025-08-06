"use client";

import React from "react";

import { useParams } from "next/navigation";

import { MobileUsersShared } from "@/app/[locale]/(root)/(dashboard)/_components/establishments/mobile-users/mobile-users-shared";

export function MobileUsersClient() {
  const params = useParams();
  const organizationId = params.id as string;
  const establishmentId = params.establishmentId as string;

  return <MobileUsersShared organizationId={organizationId} establishmentId={establishmentId} isAdmin={true} />;
}
