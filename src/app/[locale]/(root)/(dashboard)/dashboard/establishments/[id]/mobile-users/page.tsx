import React from "react";
import { MobileUsersClient } from "./mobile-users-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MobileUsersDashboardPage({ params }: Props) {
  return <MobileUsersClient />;
}
