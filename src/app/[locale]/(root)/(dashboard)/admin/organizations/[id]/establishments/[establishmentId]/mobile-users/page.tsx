import React from "react";
import { MobileUsersClient } from "./mobile-users-client";

interface Props {
  params: Promise<{ id: string; establishment_id: string }>;
}

export default async function MobileUsersAdminPage({ params }: Props) {
  return <MobileUsersClient />;
}
