import { Metadata } from "next";
import { OrganizationsDataTable } from "./_components/organizations-data-table";
import { OrganizationsHeader } from "./_components/organizations-header";

export const metadata: Metadata = {
  title: "Organisations",
  description: "Gestion des organisations du système",
};

export default function OrganizationsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <OrganizationsHeader />
      <OrganizationsDataTable />
    </div>
  );
}
