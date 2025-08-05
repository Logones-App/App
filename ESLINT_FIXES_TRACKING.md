# SUIVI DES CORRECTIONS ESLINT

## ERREURS CRITIQUES À CORRIGER (24 erreurs)

### ✅ CORRIGÉES

- [ ] `src/components/user/user-profile-card.tsx` (2 erreurs)

  - [ ] Ligne 56: `@typescript-eslint/prefer-nullish-coalescing` - `||` au lieu de `??`
  - [ ] Ligne 174: `react/no-unescaped-entities` - Apostrophe non échappée

- [ ] `src/hooks/gallery/index.ts` (1 erreur)

  - [ ] Ligne 9: `no-trailing-spaces` - Espaces en fin de ligne

- [ ] `src/hooks/gallery/use-gallery-actions.ts` (2 erreurs)

  - [ ] Lignes 3-4: `import/order` - Ordre des imports incorrect
  - [ ] Ligne 48: `no-trailing-spaces` - Espaces en fin de ligne

- [ ] `src/hooks/gallery/use-gallery-images.ts` (2 erreurs)

  - [ ] Lignes 1-2: `import/order` - Ordre des imports incorrect
  - [ ] Ligne 65: `no-trailing-spaces` - Espaces en fin de ligne

- [ ] `src/hooks/gallery/use-gallery-realtime.ts` (3 erreurs)

  - [ ] Lignes 3, 5-6: `import/order` - Ordre des imports incorrect
  - [ ] Ligne 357: `max-lines` - Fichier trop long (302 lignes, max 300)

- [ ] `src/hooks/gallery/use-gallery-reorder.ts` (3 erreurs)

  - [ ] Lignes 1, 3: `import/order` - Ordre des imports incorrect
  - [ ] Lignes 37, 58: `no-trailing-spaces` - Espaces en fin de ligne

- [ ] `src/hooks/gallery/use-gallery-sections.ts` (2 erreurs)

  - [ ] Lignes 3-4: `import/order` - Ordre des imports incorrect
  - [ ] Ligne 158: `no-trailing-spaces` - Espaces en fin de ligne

- [ ] `src/hooks/gallery/use-gallery-upload.ts` (8 erreurs)
  - [ ] Lignes 1-2: `import/order` - Ordre des imports incorrect
  - [ ] Ligne 26: `complexity` - Fonction trop complexe (16, max 10)
  - [ ] Lignes 71, 72, 73, 82, 84, 85, 86: `no-trailing-spaces` - Espaces en fin de ligne
  - [ ] Ligne 149: `no-trailing-spaces` - Espaces en fin de ligne

## RÉSUMÉ PAR TYPE D'ERREUR

- **`import/order`** : 8 erreurs
- **`no-trailing-spaces`** : 12 erreurs
- **`@typescript-eslint/prefer-nullish-coalescing`** : 1 erreur
- **`react/no-unescaped-entities`** : 1 erreur
- **`max-lines`** : 1 erreur
- **`complexity`** : 1 erreur

**Total : 24 erreurs critiques à corriger**

## NOTES

- Priorité 1: Formatage (trailing spaces, import order)
- Priorité 2: Logique (nullish coalescing, unescaped entities)
- Priorité 3: Complexité (max-lines, complexity)

## PROGRESSION

- Fichiers corrigés: 0/8
- Erreurs corrigées: 0/24
