# Vecteur golden — archive fiscale Z (NF525)

Archive fiscale **réelle**, figée, servant de **vecteur de non-régression** au vérificateur d'archives
(`src/lib/nf525/archive-verify.ts` + `archive-format.ts`).

## Pourquoi

L'ordre des clés dans `JSON.stringify` est **signifiant** pour le condensat intégral. Si le POS fait évoluer
le format (ajout d'un champ racine, réordonnancement) ou si notre profil `archive-format.ts` dérive, le
vérificateur cesse silencieusement de valider les archives réelles — sans lever d'erreur, juste en calculant
un condensat différent. Ce golden transforme cette dérive invisible en **échec de test franc**.

C'est le pendant, côté archive, du KAT qui verrouille l'interopérabilité de signature ECDSA.

## Contenu

| Fichier | Rôle |
|---|---|
| `archive.json` | archive Z réelle, octets bruts du WORM (établissement `24691661`, org de **test**, 21/07/2026, format 14 condensats, JET peuplé) |
| `public-key.txt` | clé publique ECDSA P-256 de l'établissement (base64, point compressé) — `nf525_signing_keys.public_key_base64` |

L'établissement est un établissement de **test** : aucune donnée client réelle n'est figée dans le repo.

## Lancer le contrôle

```
npm run check:nf525-golden
```

Le script (`scripts/nf525-golden-check.ts`) charge l'archive et la clé, appelle le **même** `verifyArchive`
que l'application, et exige que les 3 contrôles passent (condensats des fichiers, condensat intégral,
signature). Sort en erreur si l'un échoue.

## Le jour où le format change légitimement

Si le POS livre un nouveau format et que ce golden échoue **pour cette raison** (et non une falsification) :
mettre à jour `src/lib/nf525/archive-format.ts` (le seul fichier des règles de structure), puis **remplacer
ce golden par une archive du nouveau format**. Ne jamais éditer `archive.json` à la main — il doit rester une
archive réelle, octet pour octet.

## Restitution à l'administration (§6.9.4)

Ces deux fichiers suffisent à vérifier l'intégrité d'une archive **sans notre logiciel** : la méthode des
3 contrôles est décrite dans le champ `data.documentation` de l'archive elle-même, et la clé publique est
fournie ici. C'est ce que le référentiel exige (« exploitable sans le logiciel les ayant générés » +
« mise à disposition de la clé publique »).
