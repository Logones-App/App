# PLAN DE CORRECTION DES ERREURS CRITIQUES

## 📊 RÉSUMÉ GLOBAL

- **141 erreurs critiques** identifiées
- **Commit réussi avec --no-verify** (⚠️ PROBLÉMATIQUE)
- **Objectif : Corriger toutes les erreurs pour commits propres**

---

## 🔴 ERREURS CRITIQUES PAR CATÉGORIE

### 1. **ERREURS DE NOMAGE DE FICHIERS (Kebab-case)**

**Fichiers à renommer :**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/_components/BackToEstablishmentButton.tsx` → `back-to-establishment-button.tsx`
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/_components/MenuProductsList.tsx` → `menu-products-list.tsx`
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/_components/ProductMenusList.tsx` → `product-menus-list.tsx`
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/_components/ProductsNotInMenusList.tsx` → `products-not-in-menus-list.tsx`

**Imports à modifier après renommage :**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/menus-shared.tsx` (ligne 42)
- Tous les fichiers qui importent ces composants

**Status :** ⏳ **À FAIRE**

---

### 2. **ERREURS DE COMPLEXITÉ EXCESSIVE (CRITIQUES)**

**Fichiers avec complexité > 10 :**

#### 🔴 **Complexité 33 (URGENT)**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx`
  - Fonction : `EstablishmentSiteConfigurationShared`
  - **Action :** Extraire en composants plus petits dans `_components/`

#### 🔴 **Complexité 27 (URGENT)**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/products-shared.tsx`
  - Fonction : `ProductsShared`
  - **Action :** Extraire en composants plus petits dans `_components/`

#### 🔴 **Complexité 18 (URGENT)**

- `src/components/user/user-profile-card.tsx`
  - Fonction : `UserProfileCard`
  - **Action :** Extraire en composants plus petits dans `_components/`

#### 🔴 **Complexité 15 (URGENT)**

- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx`
  - Fonction : `BookingSlotsPage`
  - **Action :** Extraire en composants plus petits dans `_components/`

#### 🟡 **Complexité 13-14 (IMPORTANT)**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/menus-shared.tsx` (complexité 12)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (complexité 12)
- `src/app/[locale]/(root)/(dashboard)/_components/sidebar/account-switcher.tsx` (complexité 11)
- `src/app/[locale]/(root)/(dashboard)/admin/organizations/[id]/page.tsx` (complexité 11)
- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx` (complexité 13)
- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx` (complexité 13)
- `src/components/gallery/gallery-item.tsx` (complexité 12)
- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx` (complexité 14)

**Status :** ⏳ **À FAIRE**

---

### 3. **FICHIERS TROP LONGS (CRITIQUES)**

**Fichiers > 300 lignes :**

#### 🔴 **940 lignes (URGENT)**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx`
  - **Action :** Extraire en composants dans `_components/`

#### 🔴 **998 lignes (URGENT)**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/products-shared.tsx`
  - **Action :** Extraire en composants dans `_components/`

#### 🔴 **827 lignes (URGENT)**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/menus-shared.tsx`
  - **Action :** Extraire en composants dans `_components/`

#### 🟡 **395-321 lignes (IMPORTANT)**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (395)
- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx` (357)
- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx` (321)
- `src/components/user/user-profile-card.tsx` (330)
- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx` (314)

**Status :** ⏳ **À FAIRE**

---

### 4. **ERREURS DE NULLISH COALESCING (NOMBREUSES)**

**Fichiers avec `||` au lieu de `??` :**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 47, 71, 80, 261)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/products-shared.tsx` (lignes 737, 785, 846, 900, 954, 1013)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/menus-shared.tsx` (lignes 255, 625, 647, 651, 728, 823)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 181, 184, 246, 285, 299, 311)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/menus-shared.tsx` (lignes 345, 346, 347, 348, 369, 376, 383, 390, 415, 416, 417, 418, 419)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 89, 102)
- `src/app/[locale]/(root)/(dashboard)/admin/organizations/[id]/page.tsx` (lignes 74, 127)
- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx` (lignes 46, 47)
- `src/app/[locale]/(root)/(dashboard)/dashboard/establishments/[id]/booking-slots/page.tsx` (lignes 70, 71)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 111, 131)

**Status :** ⏳ **À FAIRE**

---

### 5. **ERREURS REACT ENTITIES (NOMBREUSES)**

**Fichiers avec caractères non échappés :**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 300, 316, 333)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/menus-shared.tsx` (lignes 66, 180, 185)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 218, 234, 251, 258, 259, 280, 303, 407)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 218, 234, 251, 258, 259, 280, 303, 407)

**Status :** ⏳ **À FAIRE**

---

### 6. **ERREURS D'IMPORT (NOMBREUSES)**

**Fichiers avec imports dupliqués ou mal ordonnés :**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/menus-shared.tsx` (lignes 8, 10, 11, 33, 34, 35, 36)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 13, 19)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 31, 42)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 5, 18)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 3, 31)

**Status :** ⏳ **À FAIRE**

---

### 7. **ERREURS DE TYPE ASSERTION (NOMBREUSES)**

**Fichiers avec assertions de type inutiles :**

- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 160, 191, 192)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 265, 266)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 167, 168)
- `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 213, 214)

**Status :** ⏳ **À FAIRE**

---

### 8. **ERREURS DIVERSES**

- **Espacement de fonction :** `src/lib/utils/slots-realtime-utils.ts` (ligne 231)
- **Try/catch inutiles :** `src/app/[locale]/(root)/(dashboard)/_components/establishments/establishment-site-configuration-shared.tsx` (lignes 146, 189, 205)
- **Commentaires mal formatés :** Plusieurs fichiers
- **Espaces en fin de ligne :** Plusieurs fichiers

**Status :** ⏳ **À FAIRE**

---

## 📋 PLAN D'ACTION PRIORISÉ

### **PHASE 1 : URGENT (Blocage commits)**

1. **Renommer les fichiers en kebab-case**

   - Identifier tous les imports à modifier
   - Renommer les fichiers
   - Mettre à jour tous les imports

2. **Corriger l'espacement de fonction**
   - `src/lib/utils/slots-realtime-utils.ts` ligne 231

### **PHASE 2 : CRITIQUE (Complexité + Fichiers longs)**

3. **Extraire les composants des fichiers trop longs**

   - `establishment-site-configuration-shared.tsx` (940 lignes)
   - `products-shared.tsx` (998 lignes)
   - `menus-shared.tsx` (827 lignes)

4. **Réduire la complexité des fonctions**
   - `EstablishmentSiteConfigurationShared` (complexité 33)
   - `ProductsShared` (complexité 27)
   - `UserProfileCard` (complexité 18)
   - `BookingSlotsPage` (complexité 15)

### **PHASE 3 : IMPORTANT (Qualité du code)**

5. **Corriger les nullish coalescing**

   - Remplacer tous les `||` par `??`

6. **Corriger les React entities**

   - Échapper tous les caractères spéciaux

7. **Corriger les imports**
   - Supprimer les imports dupliqués
   - Réorganiser l'ordre des imports

### **PHASE 4 : FINALISATION**

8. **Corriger les erreurs diverses**
   - Try/catch inutiles
   - Commentaires mal formatés
   - Espaces en fin de ligne

---

## ✅ SUIVI DES CORRECTIONS

### **PHASE 1 - URGENT**

- [ ] Renommer fichiers en kebab-case
- [ ] Corriger espacement de fonction

### **PHASE 2 - CRITIQUE**

- [ ] Extraire composants des fichiers longs
- [ ] Réduire complexité des fonctions

### **PHASE 3 - IMPORTANT**

- [ ] Corriger nullish coalescing
- [ ] Corriger React entities
- [ ] Corriger imports

### **PHASE 4 - FINALISATION**

- [ ] Corriger erreurs diverses

---

## 🎯 OBJECTIF FINAL

- **0 erreur critique** avant commit
- **Commits propres** sans `--no-verify`
- **Code de qualité** respectant les standards
