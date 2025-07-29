import { useMemo } from "react";

import { MetadataService, type UserPreferences, type UserProfile } from "@/lib/services/metadata-service";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useUserMetadata() {
  const { user } = useAuthStore();

  const metadata = useMemo(() => {
    if (!user) {
      return {
        appMetadata: null,
        userMetadata: null,
        preferences: null,
        profile: null,
        role: null,
        permissions: [],
        features: [],
        accessLevel: "user" as const,
        isSystemAdmin: false,
        isOrgAdmin: false,
        fullName: "",
        displayName: "",
        hasPermission: () => false,
        hasFeature: () => false,
      };
    }

    const appMetadata = MetadataService.getAppMetadata(user);
    const userMetadata = MetadataService.getUserMetadata(user);
    const preferences = MetadataService.getUserPreferences(user);
    const profile = MetadataService.getUserProfile(user);
    const role = MetadataService.getMainRole(user);

    return {
      appMetadata,
      userMetadata,
      preferences,
      profile,
      role,
      permissions: appMetadata.permissions,
      features: appMetadata.features,
      accessLevel: appMetadata.access_level,
      isSystemAdmin: MetadataService.isSystemAdmin(user),
      isOrgAdmin: MetadataService.isOrgAdmin(user),
      fullName: MetadataService.getFullName(user),
      displayName: MetadataService.getDisplayName(user),
      hasPermission: (permission: string) => MetadataService.hasPermission(user, permission),
      hasFeature: (feature: string) => MetadataService.hasFeature(user, feature),
    };
  }, [user]);

  return metadata;
}

// Hook spécialisé pour les préférences utilisateur
export function useUserPreferences() {
  const { user } = useAuthStore();

  const preferences = useMemo(() => {
    if (!user) return null;
    return MetadataService.getUserPreferences(user);
  }, [user]);

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return false;
    return await MetadataService.updateUserPreferences(user.id, newPreferences);
  };

  return {
    preferences,
    updatePreferences,
    isLoading: !preferences,
  };
}

// Hook spécialisé pour le profil utilisateur
export function useUserProfile() {
  const { user } = useAuthStore();

  const profile = useMemo(() => {
    if (!user) return null;
    return MetadataService.getUserProfile(user);
  }, [user]);

  const updateProfile = async (newProfile: Partial<UserProfile>) => {
    if (!user) return false;
    return await MetadataService.updateUserProfile(user.id, newProfile);
  };

  return {
    profile,
    updateProfile,
    isLoading: !profile,
  };
}

// Hook pour les permissions
export function useUserPermissions() {
  const { user } = useAuthStore();

  const permissions = useMemo(() => {
    if (!user) return [];
    const appMetadata = MetadataService.getAppMetadata(user);
    return appMetadata.permissions;
  }, [user]);

  const hasPermission = useMemo(() => {
    if (!user) return () => false;
    return (permission: string) => MetadataService.hasPermission(user, permission);
  }, [user]);

  return {
    permissions,
    hasPermission,
    isSystemAdmin: MetadataService.isSystemAdmin(user!),
    isOrgAdmin: MetadataService.isOrgAdmin(user!),
  };
}

// Hook pour les features
export function useUserFeatures() {
  const { user } = useAuthStore();

  const features = useMemo(() => {
    if (!user) return [];
    const appMetadata = MetadataService.getAppMetadata(user);
    return appMetadata.features;
  }, [user]);

  const hasFeature = useMemo(() => {
    if (!user) return () => false;
    return (feature: string) => MetadataService.hasFeature(user, feature);
  }, [user]);

  return {
    features,
    hasFeature,
  };
}
