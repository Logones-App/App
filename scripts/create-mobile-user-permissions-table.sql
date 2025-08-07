-- Script pour créer la table mobile_user_permissions
-- Ce script doit être exécuté dans Supabase SQL Editor

-- 1. Créer la table mobile_user_permissions
CREATE TABLE IF NOT EXISTS mobile_user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mobile_user_id UUID REFERENCES mobile_users(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT false
);

-- 2. Index pour les performances
CREATE INDEX idx_mobile_user_permissions_mobile_user_id ON mobile_user_permissions(mobile_user_id);
CREATE INDEX idx_mobile_user_permissions_organization_id ON mobile_user_permissions(organization_id);
CREATE INDEX idx_mobile_user_permissions_establishment_id ON mobile_user_permissions(establishment_id);
CREATE INDEX idx_mobile_user_permissions_deleted ON mobile_user_permissions(deleted);

-- 3. Contrainte unique pour éviter les doublons
CREATE UNIQUE INDEX idx_mobile_user_permissions_unique 
ON mobile_user_permissions(mobile_user_id, permission, organization_id) 
WHERE deleted = false; 