"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserMetadata, useUserPreferences } from "@/hooks/use-user-metadata";
import { Shield, User, Settings, Bell, Palette, Globe } from "lucide-react";

export function UserProfileCard() {
  const {
    role,
    permissions,
    features,
    accessLevel,
    isSystemAdmin,
    isOrgAdmin,
    fullName,
    displayName,
    preferences,
    profile,
    hasPermission,
    hasFeature,
  } = useUserMetadata();

  const { updatePreferences } = useUserPreferences();

  const handleThemeChange = async () => {
    const newTheme = preferences?.theme === "dark" ? "light" : "dark";
    await updatePreferences({ theme: newTheme });
  };

  const handleLanguageChange = async () => {
    const newLanguage = preferences?.language === "fr" ? "en" : "fr";
    await updatePreferences({ language: newLanguage });
  };

  if (!role) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil Utilisateur</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informations principales */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback>
                {fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">{displayName}</CardTitle>
              <CardDescription>{profile?.bio || "Aucune bio"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={isSystemAdmin ? "default" : "secondary"}>
              <Shield className="mr-1 h-3 w-3" />
              {role}
            </Badge>
            <Badge variant="outline">
              <User className="mr-1 h-3 w-3" />
              {accessLevel}
            </Badge>
            {hasPermission("admin") && (
              <Badge variant="destructive">
                <Shield className="mr-1 h-3 w-3" />
                Admin
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions et Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Permissions & Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="mb-2 font-medium">Permissions</h4>
            <div className="flex flex-wrap gap-1">
              {permissions.map((permission) => (
                <Badge key={permission} variant="outline" className="text-xs">
                  {permission}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <h4 className="mb-2 font-medium">Features</h4>
            <div className="flex flex-wrap gap-1">
              {features.map((feature) => (
                <Badge key={feature} variant="secondary" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Préférences utilisateur */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="mr-2 h-4 w-4" />
            Préférences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Thème</label>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">{preferences?.theme || "auto"}</span>
                <Button size="sm" variant="outline" onClick={handleThemeChange}>
                  Changer
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Langue</label>
              <div className="flex items-center space-x-2">
                <span className="text-muted-foreground text-sm">
                  {preferences?.language === "fr" ? "Français" : "English"}
                </span>
                <Button size="sm" variant="outline" onClick={handleLanguageChange}>
                  <Globe className="mr-1 h-3 w-3" />
                  Changer
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notifications</label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm">Email: {preferences?.notifications.email ? "Activé" : "Désactivé"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm">Push: {preferences?.notifications.push ? "Activé" : "Désactivé"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations système */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Système</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Rôle principal:</span>
            <span className="font-medium">{role}</span>
          </div>
          <div className="flex justify-between">
            <span>Niveau d'accès:</span>
            <span className="font-medium">{accessLevel}</span>
          </div>
          <div className="flex justify-between">
            <span>System Admin:</span>
            <span className="font-medium">{isSystemAdmin ? "Oui" : "Non"}</span>
          </div>
          <div className="flex justify-between">
            <span>Org Admin:</span>
            <span className="font-medium">{isOrgAdmin ? "Oui" : "Non"}</span>
          </div>
          <div className="flex justify-between">
            <span>Timezone:</span>
            <span className="font-medium">{profile?.timezone}</span>
          </div>
          <div className="flex justify-between">
            <span>Format date:</span>
            <span className="font-medium">{profile?.date_format}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
