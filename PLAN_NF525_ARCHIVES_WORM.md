# Plan — Archives fiscales Z (WORM S3) : consultation, export de période, vérification

_Transfert POS → SaaS acté le 2026-07-15. Chantier post-audit. Rédigé le 2026-07-16._

## 0. Pourquoi ce chantier

Le POS nous transfère la **vérification et l'exploitation** des archives Z. Leur vérificateur autonome
vérifiait un JSON non extractible de la tablette. **L'archive de référence est celle du WORM S3** — c'est là
qu'il faut la vérifier, et **nous seuls avons les accès**. Bénéfice : leur position « l'archive de période =
assemblage des archives Z journalières » est aujourd'hui **déclarative** ; notre export la **matérialise**.

## 1. État des prérequis

| Prérequis | État |
|---|---|
| Accès S3 en lecture | ✅ **levé** — IAM `logones-nf525-reader`, policy `logones-nf525-s3-read` (Liste/Lecture, scope `nf525/*`) |
| Séparation des rôles | ✅ **prouvée** — PUT avec la clé reader → `403 AccessDenied` explicite d'AWS |
| Format des archives | ✅ **reverse-validé à l'octet** (voir §2) |
| Vecteur golden | ✅ **dérivé nous-mêmes** — plus besoin du POS |
| ① Règle de période (`closed_at`) | 🟡 **réponse de travail POS, non figée** → isolée derrière un point unique (§6) |
| ③ JET 20/30 | ⛔ **hors périmètre** — le POS a demandé de ne pas développer |

## 2. Ce qui est prouvé (ne pas re-débattre)

Sur une archive réelle, les 3 contrôles recalculés **correspondent à l'octet** aux valeurs qu'elle porte :
- **① Condensats des fichiers logiques** : `hashes[nom] = SHA256hex(JSON.stringify(contenu))` pour les 7 fichiers
  (`nf525_pieces`, `nf525_piece_recap_tva`, `order_products`, `order_payments`, `order_payment_settlements`,
  `payment_methods`, `manifest`), où
  `manifest = {version, created_at, organization_id, establishment_id, device_id, daily_found_id, scope}`.
- **② Condensat intégral** : `SHA256hex(JSON.stringify({version, created_at, organization_id, establishment_id,
  device_id, daily_found_id, operation_type, scope, data, totals, hashes}))` == **dernier champ** de
  `hash_chain_input`. ⚠️ **Cet ordre diffère de l'ordre des clés de l'archive** → construire un objet dédié.
- **③ Signature** : ECDSA P-256 sur `SHA256(hash_chain_input)`, base64url, clé
  `nf525_signing_keys.public_key_base64`, `prehash:false`.
- ⚠️ **Les 3 sont indissociables** : altérer le contenu sans toucher `hash_chain_input` laisse la signature
  valide → **seul ② le détecte**. Vérifier la signature seule = **faux OK sur archive falsifiée**.
- Le condensat étant **toujours le dernier champ**, `lastIndexOf(",")` l'extrait — la ventilation TVA peut
  contenir des virgules sans ambiguïté.

### 🔴 Le champ `version` NE discrimine PAS (trouvé au scan)
Une archive non signée du 20/06 porte **`version: 1`**, comme le format actuel signé, alors qu'elle n'a que
**4 fichiers `data`** et **ni `operation_type`, ni `hash_chain_input`, ni `signature_base64url`**.
→ **Règle : discriminer sur la STRUCTURE, jamais sur le numéro de version.**
**Archive vérifiable ⇔ elle porte `hash_chain_input` ET `signature_base64url`.** Sinon → *hors périmètre*
(ancien format), exclue **explicitement** et signalée dans le rapport, jamais en silence.

## 3. Règles de chaînage (spec POS « solide », à implémenter telle quelle)

- Chaîne par **(établissement, device)**, **jamais entrelacée** (raison : offline — une caisse qui clôture sans
  réseau ne peut pas connaître la signature d'un autre device). Un établissement n'a **qu'une caisse ouverte à
  la fois** → les chaînes se succèdent en **blocs contigus**.
- `archive(n).previous_archive_signature == archive(n-1).signature_base64url`.
- **Chaîner sur l'ORDRE des archives, JAMAIS le calendrier** (jour de fermeture = pas d'archive → l'archive du
  mardi se chaîne à celle du dimanche).
- ⚠️ **`report_previous_signature === false` n'est PAS fiable** : l'ancre vit dans le stockage local du device →
  réinstallation / purge locale = **fausse genèse en pleine vie**.
  **Règle fiable : genèse ⇔ 1ʳᵉ archive de ce `device_id` (tri `created_at`)** — calculable depuis S3 seul.
  Une 2ᵉ genèse pour un `device_id` déjà connu = **anomalie → 90**.
- **Device remplacé/ré-appairé** → `device_id` change → **nouvelle chaîne légitime**, aucun chaînage vers l'ancien.
- ⚠️ **Exclure les archives sans `signature_base64url`** : elles ne font pas avancer le fil (la suivante se chaîne
  à N-1) → sans cette exclusion, **faux positif garanti**.

## 4. Architecture

**Décision : route serveur Next**, pas d'Edge Function. L'Edge n'est nécessaire que pour *signer* (service_role) ;
ici on ne fait que lire. Une route serveur est plus simple à tester et cohérente avec le reste du SaaS.

```
src/lib/nf525/s3-read.ts          SigV4 maison (zéro dép) : list / get / listVersions
src/lib/nf525/archive-verify.ts   les 3 contrôles + discrimination de structure
src/lib/nf525/archive-chain.ts    chaînage par device + règle de genèse + exclusions
src/app/api/establishments/[id]/archives/route.ts        GET : liste/export par période
src/app/api/establishments/[id]/archives/verify/route.ts POST : vérification + JET 90
```

⚠️ **Les identifiants doivent être posés en variables d'environnement Coolify** (`NF525_S3_READ_ACCESS_KEY_ID`,
`NF525_S3_READ_SECRET_ACCESS_KEY`) — ils ne sont aujourd'hui que dans les secrets Supabase, inaccessibles depuis
une route Next.

**Accès** : `system_admin` + `org_admin` uniquement (même politique que l'export comptable — ce n'est pas une
action déléguable en caisse).

## 5. La page — `dashboard/establishments/[id]/reporting/archives`

« **Archives fiscales** », à côté de *Export comptable* dans la sidenav org-admin, groupe *Reporting* : même public
(system_admin + org_admin), même nature (restitution fiscale), même pattern (`page.tsx` + `_components/`).
Il n'y a pas de hub à tuiles pour le Reporting — l'entrée de nav est le seul point d'accès, comme pour l'export comptable.

**Actions, à la demande (aucun contrôle quotidien — décision produit) :**
1. **Consulter la période** — sélecteur de dates → liste des archives déposées (jour d'exploitation, caisse, dépôt).
2. **Tester l'intégrité** — les 3 contrôles + le chaînage sur la période, avec le détail par contrôle (jamais un
   « OK » global qui masquerait un contrôle non effectué) et les exclusions affichées explicitement.
3. **Récupérer les archives (JSON)** — téléchargement du contenu intégral (`?content=1`), séparé pour ne pas
   télécharger le corps des archives quand on ne fait que consulter.

## 6. Export de période — le point sensible

**Le chemin S3 n'est pas fiable** : `nf525/{org}/{estab}/{YYYY-MM-DD}/{daily_found_id}.json` où la date est celle
de l'**upload (UTC)**, pas le jour d'exploitation.

**Règle de travail (① — À CONFIRMER par le POS)** : jour d'exploitation = **`daily_found.closed_at`**, en heure
locale **Europe/Paris**. Résolution : `daily_found_id` (dans le chemin **et** dans le manifest) → table `daily_found`.

> **Isolation** : cette règle vit dans **une seule fonction** `businessDayOf(archive): string` (+ sa requête
> `daily_found`). Si le POS change de doctrine, **on ne touche qu'à elle**. Ne pas la disséminer.

**Optimisation de listing (sûre)** : l'upload étant fait **à la clôture**, la date du chemin est à **±1 jour** de la
date Paris (Paris = UTC+1/+2). Donc pour une période `[from, to]`, lister les préfixes de dates
**`[from-1j, to+1j]`**, puis filtrer sur `businessDayOf()`. Borné et correct.

**Cas limites (spec POS)** :
- `closed_at` **null** → **exception explicite** (log + exclusion du périmètre), **jamais en silence** (5 cas legacy
  connus ; un null récent serait un vrai défaut à remonter).
- Sessions **> 24 h** : légitimes (une caisse reste ouverte tant qu'une table n'est pas encaissée) — mais **aucune
  nouvelle commande après 24 h** → la « fuite de période » est **bornée à ~24 h de ventes** à une frontière de mois.

## 7. JET 90 — anti-répétition (obligatoire)

Un 90 est **NON PURGEABLE** : un signal émis à tort pollue la piste d'audit **définitivement**. Or les tests sont
sur un **bouton** → 10 clics = 10 détections de la même rupture.

**Table dédiée**, l'unicité EN BASE fait la garantie (pas la logique applicative) :
```sql
create table nf525_integrity_defects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  establishment_id uuid not null,
  defect_type text not null,          -- 'chain_break' | 'archive_integrity'
  defect_key text not null,           -- 'chain:{sigN-1}:{sigN}' | 'archive:{s3_key}'
  detected_at timestamptz not null default now(),
  jet_event_id bigint,                -- event_id du 90 émis
  details jsonb,
  unique (establishment_id, defect_key)
);
```
**Séquence** : `INSERT … ON CONFLICT DO NOTHING` → **si 0 ligne insérée = déjà signalé → on n'émet rien**. Si 1 ligne
insérée → on émet le 90 → on stocke son `event_id`. **Les 2 exclusions (non signées, genèse légitime) s'appliquent
AVANT** cette insertion.

**Clé d'anti-répétition** : rupture de chaîne → la **paire de signatures** (spec POS) ; défaut sur une archive isolée
(signature/condensat KO, chaîne intacte) → la **clé S3** de l'archive.

## 8. Hors périmètre (assumé, décisions produit)

- **JET 20/30** : le POS re-vérifie sa doctrine → **ne pas développer**. Leur piste : le 20 porterait lui-même le
  condensat de la période. ⚠️ **Séquencement** : ils ne retirent leurs émissions **qu'après** que les nôtres soient en
  prod et cross-testées.
- **Contrôle quotidien / cron / index** : abandonné (tout est à la demande) → pas d'état à maintenir.
- **Versions multiples d'une clé S3** : **on ne traite pas**. Défendable : les 3 contrôles détectent déjà une archive
  falsifiée (sa signature ne vérifierait pas) ; `ListObjectVersions` n'aurait servi qu'à *récupérer* l'original.
  *(Constat : 3 clés en ont aujourd'hui — sur des établissements de test, des ré-uploads.)*

## 9. Lots

| Lot | Contenu | État |
|---|---|---|
| **L1** | `s3-read.ts` (SigV4) + creds Coolify + route liste | ✅ fait |
| **L2** | `archive-verify.ts` : 3 contrôles + discrimination de structure | ✅ fait |
| **L3** | `archive-chain.ts` : chaînage par device, genèse, 2 exclusions | ✅ fait |
| **L4** | Table `nf525_integrity_defects` + émission 90 anti-répétition | ⏸️ reporté — « on branchera les JET si besoin ». Rien ne le bloque : `defectKey` est déjà produit par `checkChains()` pour l'anti-répétition. |
| **L5** | Page `reporting/archives` + boutons + rapport | ✅ fait — sidenav org-admin, groupe Reporting |
| **L6** | Export de période (`businessDayFromClosedAt`) | ✅ fait — `archive-period.ts`, règle ① isolée dans ce seul fichier |
| ~~L7~~ | ~~JET 20/30~~ | ⛔ bloqué (③) |

**Prérequis de déploiement** : `NF525_S3_READ_ACCESS_KEY_ID` et `NF525_S3_READ_SECRET_ACCESS_KEY` dans Coolify
(et dans `.env.local` pour tester en local — Next ne charge pas `.env.nf525.local`). Sans elles, la route
échoue en 500 avec un message explicite.

## 10. Preuves déjà au dossier (scan du 2026-07-16, 49 archives)

- **Les 4 établissements ECDSA sont à 100 %** : `bc066cb5` 3/3, `b3d0b79d` 3/3, `24691661` 1/1 (créé **en live**
  pendant l'audit) — ①②③ tous verts.
- **34/49 archives non signées** — **toutes** sur les vieux établissements de test (`eb64c088` 28, `0fb9095f` 6) :
  ancien format (4 fichiers, sans `hash_chain_input`). Aucune en production.
- **3 clés à versions multiples** — établissements de test uniquement.

_Liés : [[project_nf525_archives_worm]], [[project_nf525_ecdsa_signature]], [[project_nf525_inalterabilite]]._
