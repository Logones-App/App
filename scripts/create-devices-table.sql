-- Script pour créer la table devices
-- Ce script doit être exécuté dans Supabase SQL Editor

-- 1. Créer la table devices
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  establishment_id UUID REFERENCES establishments(id) ON DELETE CASCADE,
  device_type VARCHAR(50) NOT NULL DEFAULT 'tablet',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted BOOLEAN DEFAULT false
);

-- 2. Index pour les performances
CREATE INDEX idx_devices_establishment_id ON devices(establishment_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_deleted ON devices(deleted);

-- 3. Contrainte unique pour éviter les doublons
CREATE UNIQUE INDEX idx_devices_unique_device_id 
ON devices(device_id) 
WHERE deleted = false;

-- 4. Contrainte pour s'assurer qu'un device n'est que dans un établissement
CREATE UNIQUE INDEX idx_devices_unique_establishment 
ON devices(establishment_id, device_id) 
WHERE deleted = false; 