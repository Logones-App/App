# Guide complet d’internationalisation (i18n)

Ce projet utilise `next-intl` (v4) pour l’internationalisation, avec une structure de routes dynamique `[locale]` conforme aux bonnes pratiques Next.js 15.

## Structure recommandée

- `src/app/[locale]/` : segment dynamique pour la langue (ex : `en`, `fr`)
- Chaque page/layout dans `[locale]` hérite du paramètre `locale`
- Les messages sont stockés dans `/messages/{locale}.json`
- Les composants localisés sont préfixés par `localized-`

## Bonnes pratiques

- Utiliser le provider `next-intl` dans le layout racine `[locale]/layout.tsx`
- Utiliser le composant `Link` de `next-intl/navigation` pour préserver le contexte de langue
- Accéder aux paramètres de route (`params.locale`) de façon asynchrone avec `resolveRouteParams`
- Préférer les hooks fournis (`useTranslations`, etc.) pour accéder aux messages
- Toujours fallback sur une langue par défaut (ex : `en`)

## Exemple de pattern

```tsx
// Exemple d’accès asynchrone au paramètre locale dans generateMetadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await resolveRouteParams(params);
  const { locale } = resolvedParams;
  return getLocalizedMetadata(locale, "pageName");
}
```

## Erreurs courantes et solutions

- "Route used `params.locale`. `params` should be awaited before using its properties" :
  → Toujours await `resolveRouteParams` avant d’utiliser `params.locale`.
- Oublier d’utiliser le provider `next-intl` dans le layout racine :
  → Ajouter le provider dans `[locale]/layout.tsx`.
- Ne pas préfixer les routes par le locale :
  → Toutes les routes doivent être sous `[locale]/`.

## Ressources complémentaires
- [Documentation officielle next-intl](https://next-intl-docs.vercel.app/)
- [Exemples Next.js i18n](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

Ce guide fait foi pour toute question ou correction liée à l’internationalisation dans ce projet.
