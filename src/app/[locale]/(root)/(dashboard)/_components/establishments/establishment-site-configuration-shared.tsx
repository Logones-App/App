"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Settings, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BackToEstablishmentButton } from "./BackToEstablishmentButton";
import { SiteConfigurationImageManagement } from "./site-configuration/site-configuration-image-management";

interface EstablishmentSiteConfigurationSharedProps {
  establishmentId: string;
  organizationId: string;
  establishmentName: string;
  isSystemAdmin: boolean;
}

export function EstablishmentSiteConfigurationShared({
  establishmentId,
  organizationId,
  establishmentName,
  isSystemAdmin,
}: EstablishmentSiteConfigurationSharedProps) {
  const t = useTranslations("SiteConfiguration");
  const [activeTab, setActiveTab] = useState("image-management");

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BackToEstablishmentButton establishmentId={establishmentId} organizationId={organizationId} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description", { establishmentName })}</p>
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-1 lg:grid-cols-2">
          <TabsTrigger value="image-management" className="flex items-center space-x-2">
            <ImageIcon className="h-4 w-4" />
            <span>{t("tabs.imageManagement")}</span>
          </TabsTrigger>
          <TabsTrigger value="general-settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>{t("tabs.generalSettings")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Gestion des images */}
        <TabsContent value="image-management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5" />
                <span>{t("imageManagement.title")}</span>
              </CardTitle>
              <CardDescription>{t("imageManagement.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SiteConfigurationImageManagement
                establishmentId={establishmentId}
                organizationId={organizationId}
                isSystemAdmin={isSystemAdmin}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paramètres généraux */}
        <TabsContent value="general-settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>{t("generalSettings.title")}</span>
              </CardTitle>
              <CardDescription>{t("generalSettings.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center">
                <Settings className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <p className="text-muted-foreground">{t("generalSettings.comingSoon")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
