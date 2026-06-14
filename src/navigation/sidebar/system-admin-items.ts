import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Database,
  FileText,
  FileCheck2,
  Globe,
  HelpCircle,
  Home,
  Package,
  Settings,
  Shield,
  Target,
  Users,
} from "lucide-react";

import { type NavGroup } from "./sidebar-items";

export const getSystemAdminSidebarItems = (locale?: string): NavGroup[] => {
  const baseUrl = locale ? `/${locale}` : "";

  return [
    {
      id: 1,
      label: "Tableau de bord",
      items: [
        {
          title: "Vue d'ensemble",
          url: `${baseUrl}/admin`,
          icon: Home,
        },
        {
          title: "Statistiques",
          url: `${baseUrl}/admin/analytics`,
          icon: BarChart3,
        },
        {
          title: "Activité système",
          url: `${baseUrl}/admin/activity`,
          icon: Activity,
        },
      ],
    },
    {
      id: 2,
      label: "CRM",
      items: [
        {
          title: "Leads",
          url: `${baseUrl}/admin/leads`,
          icon: Target,
        },
        {
          title: "Catalogue produits",
          url: `${baseUrl}/admin/crm-produits`,
          icon: Package,
        },
        {
          title: "Validation devis",
          url: `${baseUrl}/admin/devis`,
          icon: FileCheck2,
        },
      ],
    },
    {
      id: 3,
      label: "Administration",
      items: [
        {
          title: "Organisations",
          url: `${baseUrl}/admin/organizations`,
          icon: Building2,
          subItems: [
            {
              title: "Toutes les organisations",
              url: `${baseUrl}/admin/organizations`,
            },
            {
              title: "Nouvelle organisation",
              url: `${baseUrl}/admin/organizations/new`,
            },
            {
              title: "Paramètres",
              url: `${baseUrl}/admin/organizations/settings`,
            },
          ],
        },
        {
          title: "Utilisateurs",
          url: `${baseUrl}/admin/users`,
          icon: Users,
          subItems: [
            {
              title: "Tous les utilisateurs",
              url: `${baseUrl}/admin/users`,
            },
            {
              title: "Nouvel utilisateur",
              url: `${baseUrl}/admin/users/new`,
            },
            {
              title: "Rôles et permissions",
              url: `${baseUrl}/admin/users/roles`,
            },
          ],
        },
        {
          title: "Domaines",
          url: `${baseUrl}/admin/domains`,
          icon: Globe,
          subItems: [
            {
              title: "Tous les domaines",
              url: `${baseUrl}/admin/domains`,
            },
            {
              title: "Nouveau domaine",
              url: `${baseUrl}/admin/domains/new`,
            },
            {
              title: "Configuration DNS",
              url: `${baseUrl}/admin/domains/dns`,
            },
          ],
        },
        {
          title: "Sécurité",
          url: `${baseUrl}/admin/security`,
          icon: Shield,
          subItems: [
            {
              title: "Audit de sécurité",
              url: `${baseUrl}/admin/security/audit`,
            },
            {
              title: "Politiques d'accès",
              url: `${baseUrl}/admin/security/policies`,
            },
            {
              title: "Sessions actives",
              url: `${baseUrl}/admin/security/sessions`,
            },
          ],
        },
      ],
    },
    {
      id: 4,
      label: "Système",
      items: [
        {
          title: "Paramètres système",
          url: `${baseUrl}/admin/settings`,
          icon: Settings,
          subItems: [
            {
              title: "Configuration générale",
              url: `${baseUrl}/admin/settings/general`,
            },
            {
              title: "Notifications",
              url: `${baseUrl}/admin/settings/notifications`,
            },
            {
              title: "Intégrations",
              url: `${baseUrl}/admin/settings/integrations`,
            },
            {
              title: "Sauvegarde",
              url: `${baseUrl}/admin/settings/backup`,
            },
          ],
        },
        {
          title: "Base de données",
          url: `${baseUrl}/admin/database`,
          icon: Database,
          subItems: [
            {
              title: "État de la base",
              url: `${baseUrl}/admin/database/status`,
            },
            {
              title: "Migrations",
              url: `${baseUrl}/admin/database/migrations`,
            },
            {
              title: "Logs",
              url: `${baseUrl}/admin/database/logs`,
            },
          ],
        },
        {
          title: "Logs système",
          url: `${baseUrl}/admin/logs`,
          icon: FileText,
          subItems: [
            {
              title: "Logs d'application",
              url: `${baseUrl}/admin/logs/application`,
            },
            {
              title: "Logs d'erreur",
              url: `${baseUrl}/admin/logs/errors`,
            },
            {
              title: "Logs d'accès",
              url: `${baseUrl}/admin/logs/access`,
            },
          ],
        },
      ],
    },
    {
      id: 5,
      label: "Support",
      items: [
        {
          title: "Notifications",
          url: `${baseUrl}/admin/notifications`,
          icon: Bell,
        },
        {
          title: "Aide et support",
          url: `${baseUrl}/admin/support`,
          icon: HelpCircle,
        },
        {
          title: "Base de connaissances",
          url: `${baseUrl}/admin/knowledge-base`,
          icon: BookOpen,
        },
      ],
    },
  ];
};
