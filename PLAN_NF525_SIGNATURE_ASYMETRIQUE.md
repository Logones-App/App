# Plan — Migration signature JET vers l'asymétrique (SaaS)

_Décision POS + SaaS (2026-07-13) : abandonner le HMAC symétrique pour une signature
**asymétrique** conforme §6.11.3 (RSA-2048-PSS ou ECDSA-256). Ce document = périmètre
complet du travail **côté SaaS**. Sources : `_DOC/NF525_Officiel/` (Exigences Produit §6.11.3,
§6.15.1 ; R19), et le code existant (`nf525_jet_*_saas`, `nf525_signing_keys`, trigger 410)._

---

## 0. Réalité calendaire (à acter)
La migration asymétrique est un **chantier de plusieurs semaines** (signature hors base, infra
clé, restitution, vérif, migration). **Elle ne sera PAS prête pour l'audit du 15/07.**
→ L'audit du 15/07 tourne sur l'**intérim HMAC + dossier Note 11** (cf. `NF525_SIGNATURE_STRATEGIE.md`).
L'asymétrique est la **cible post-audit**. **À confirmer avec le POS** que l'auditeur l'accepte ainsi.

---

## 1. Décisions à VERROUILLER avec le POS avant d'écrire une ligne (bloquantes)

| # | Décision | Options | Impact |
|---|---|---|---|
| **D1** | Algorithme | **ECDSA P-256** (reco : signatures courtes/rapides) ou RSA-2048-PSS | Doit être **identique des 2 côtés** si clé partagée |
| **D2** | **Modèle de clé (LE pivot)** | **(a) partagée** : 1 paire/établissement, POS **et** SaaS signent avec la **même privée** ; **(b) séparée** : 1 paire **par signeur** (POS a la sienne, SaaS la sienne) → 2 sous-chaînes vérifiables (`device_id NULL` = SaaS, `device_id X` = POS) | (a) = clé privée dupliquée sur 2 systèmes = risque confidentialité ; (b) = plus propre mais restitution de 2 clés publiques |
| **D3** | Stockage clé privée | **KMS externe** (AWS/GCP KMS, clé **non-extractible**, signe côté KMS) ou **Supabase Vault** (pgsodium, clé déchiffrable) | §6.11.3 l.2719 exige de **documenter la confidentialité** ; KMS = plus fort |
| **D4** | Génération de la paire | SaaS au provisioning, ou POS | Détermine qui détient/injecte la privée |
| **D5** | Restitution clé publique | format + canal attendus par l'auditeur (§6.15.1) | Écran/endpoint à livrer |

> **Reco SaaS** : **D1 = ECDSA P-256**, **D2 = (b) clés séparées par signeur** (chacun garde sa privée,
> aucune duplication de secret ; le JET reste un journal commun, deux sous-chaînes), **D3 = KMS**
> si dispo sinon Vault. À arbitrer avec le POS.

---

## 2. Changement architectural majeur : la signature SORT de la base

- `pgcrypto` **ne fournit pas** RSA-PSS/ECDSA (seulement HMAC/digest). `pgsodium` = Ed25519 (EdDSA,
  **non** nommé par la norme). → **impossible de signer en base de façon conforme.**
- **La signature doit se faire en code applicatif** : **Node** (`crypto.sign`, RSA-PSS/ECDSA) dans une
  route serveur, **ou** **Edge Function** (Deno WebCrypto), **ou** appel **KMS** (signe côté KMS).
- **§6.11.3 (l.2667)** : signature « au moment de l'enregistrement définitif » → **synchrone** dans la
  transaction d'écriture du JET. **Pas d'asynchrone** (pas de file d'attente qui signe plus tard).
- ⚠️ **Conséquence directe** : les **4 RPC `nf525_jet_*_saas`** (signature en base) et le **trigger DB
  `trg_nf525_jet_410_establishment`** deviennent **caducs** → toute la logique (chaînage, RAISE sans clé,
  sanitisation label, `purgeable`) est **réimplémentée en code applicatif**. **On défait le trigger 410
  qu'on vient de poser** — voir L3 pour re-sécuriser le bypass autrement.

---

## 3. Lots de travail (SaaS)

### L1 — Schéma clé + génération de la paire
- **Table `nf525_signing_keys`** : ajouter `algorithm` (text), `public_key` (text/pem), `key_version`,
  `private_key_ref` (référence Vault/KMS) ; **déprécier** `signing_key_base64` (symétrique).
- **Provisioning** (`establishment-provisioning.ts` → `insertNf525Key`) : remplacer
  `generateSigningKey()` (32 octets) par une **génération de paire** (ECDSA P-256 / RSA-2048), stocker
  **privée en Vault/KMS** + **publique** en base.
- Conserver le prérequis « clé à la création » (rollback) — mais il crée désormais une **paire**.
- **Retirer** la contrainte anti-`?` base64 (b.1 de l'intérim) — remplacée par une validation de clé
  asymétrique (PEM/coordonnées valides).

### L2 — Service de signature applicatif (le cœur)
- Nouveau module `src/lib/nf525/sign.ts` :
  - `buildChain()` : chaîne R19 canonique (champs ordonnés, séparateur `,`, **sanitisation** `,`/`|`→espace) — logique reprise des RPC actuelles.
  - `sha256(chain)` → condensat (Note 9 OK).
  - `sign(digest, privateKeyRef)` : RSA-PSS/ECDSA via `crypto` **ou** appel KMS.
  - encodage **base64url** (inchangé).
  - **chaînage** : lecture `prev_signature` (fil `device_id NULL`), `event_id = MAX+1`, **sérialisation**
    de la concurrence (aujourd'hui `FOR UPDATE` en base → à reproduire : `SELECT … FOR UPDATE` sur la
    ligne clé, ou advisory lock Postgres, dans la transaction).
  - **RAISE sans clé active** (reprise du comportement 180/290/410).
- **Remplacer** `src/lib/permissions/nf525-jet.ts` (`writeJet130/180/290`) : au lieu d'appeler les RPC,
  ils appellent le service de signature applicatif + INSERT `nf525_jet`.

### L3 — 410 hors trigger + re-fermeture du bypass (point délicat)
- **Supprimer** le trigger `trg_nf525_jet_410_establishment` + `fn_nf525_jet_410_on_establishment_update`.
- Ré-détecter les **champs assujetti modifiés** en code (logique qu'on avait dans la route PATCH avant de
  la déplacer en trigger) → signer le 410 via **L2**, **dans la même transaction** que l'UPDATE.
- ⚠️ **Le trigger servait justement à fermer le bypass `useUpdateEstablishment`.** Sans lui, il faut
  re-fermer autrement :
  - **Option recommandée** : **RLS** — `REVOKE UPDATE ON establishments` aux rôles applicatifs client ;
    seules les **routes serveur (service_role)** peuvent modifier un établissement, et elles **signent
    toujours** le 410. `useUpdateEstablishment` (client) est alors neutralisé par la base.
  - Alternative : trigger **garde** qui **refuse** un changement de champ fiscal si aucun 410 n'est écrit
    dans la même transaction (complexe, fragile).

### L4 — Restitution clé publique + contrôle d'intégrité (§6.15.1 + §6.11.3.4)
- **Endpoint/écran de restitution** de la clé publique par établissement (§6.15.1).
- **Fonction de vérification** : `verify(sig, sha256(hash_chain_input), public_key)` + **continuité de
  chaînage** (chaque `previous_signature` = signature de l'événement précédent) ; **erreurs
  d'intégrité loggées en JET** (§6.11.3.4 l.2755).
- **Outil bi-ère** : les événements **avant** la bascule sont HMAC, **après** sont asymétriques →
  le vérificateur doit gérer les deux régimes (voir L5).

### L5 — Migration des données + bascule
- **Événement « changement de trousseau de clés »** (R19 l.1186-1188) écrit **par établissement** au
  moment de la bascule → trace la transition HMAC→asymétrique dans la chaîne.
- **Historique HMAC conservé** tel quel (re-vérifié avec l'ancienne clé symétrique) ; **nouveaux
  événements** en asymétrique.
- **Backfill** : générer une **paire** pour chaque établissement existant + publier la publique.
- **Nouvel établissement d'audit** : s'il est créé **après** la bascule, il est **100 % asymétrique**
  d'emblée (aucun historique HMAC) — le cas le plus propre.

### L6 — Tests + dossier de conformité
- Tests : round-trip sign/verify, chaînage, **concurrence** (2 JET simultanés même établissement),
  restitution clé publique, vérif bi-ère, RAISE sans clé.
- **Documentation §6.11.3 l.2719** : algorithme retenu, **mesures de confidentialité de la clé privée**
  (KMS/Vault), procédure de **rotation** (+ événement trousseau).
- Le **dossier Note 11 HMAC** devient inutile une fois l'asymétrique en place (garder uniquement pour
  l'intérim 15/07).

---

## 4. Impacts sur le travail DÉJÀ livré (à défaire / adapter)
| Élément livré (intérim) | Sort dans la cible asymétrique |
|---|---|
| 4 RPC `nf525_jet_*_saas` (signature HMAC en base) | **Caducs** → logique reportée en code app (L2) |
| Trigger `trg_nf525_jet_410_establishment` | **Supprimé** (L3), 410 signé en app |
| Fermeture bypass via trigger | **Re-faite via RLS** (L3) |
| Contrainte anti-`?` base64 (b.1) | **Remplacée** par validation de clé asymétrique (L1) |
| Prérequis « clé à la création » + rollback | **Conservé**, mais génère une **paire** (L1) |
| Export bloqué sans clé (180/290, JET avant fichier/email) | **Conservé**, signe via L2 |
| Sanitisation label R19 §4.1 | **Conservée**, portée dans `buildChain()` (L2) |

## 5. Ce qui NE change PAS (le « quoi » signé)
- **SHA-256** (Note 9), **base64url** (R19 §4.1 l.507), **chaîne R19 canonique** (séparateur `,`,
  sanitisation), **chaînage** prev-signature, `event_id` séquentiel, `purgeable`.
- Seule la **primitive de signature** change (HMAC → RSA-PSS/ECDSA). Le contenu signé est identique.

## 6. Risques / points durs
1. **Signature synchrone en transaction** : latence (surtout KMS distant) sur chaque écriture JET.
2. **Concurrence hors base** : reproduire la sérialisation `FOR UPDATE`/advisory lock pour `event_id` +
   chaînage sans trous ni collisions.
3. **Confidentialité clé privée** (§6.11.3 l.2719) : KMS = plus sûr mais infra/coût ; Vault = plus
   simple mais clé déchiffrable.
4. **Coordination POS** : D2 (partagée vs séparée) conditionne toute l'architecture.
5. **Re-fermeture du bypass 410** sans trigger DB (RLS à cadrer proprement).
6. **Calendrier** : pas pour le 15/07.

## 7. Estimation (T-shirt)
| Lot | Taille |
|---|---|
| L1 schéma + génération paire | M |
| L2 service de signature | **L** |
| L3 410 hors trigger + RLS | M |
| L4 restitution + vérif intégrité | M |
| L5 migration + bascule + backfill | M |
| L6 tests + dossier conformité | M |
| **Total** | **~ plusieurs semaines** |

## 8. Questions ouvertes POS (à trancher — D1→D5)
1. **D1** Algorithme commun : ECDSA P-256 ou RSA-2048-PSS ?
2. **D2** Clé **partagée** (1 paire/établissement, 2 signeurs) ou **séparée** (1 paire/signeur, 2 sous-chaînes) ?
3. **D3** Stockage privée : KMS externe ou Vault Supabase ? (côté SaaS)
4. **D4** Qui génère la paire à la création d'établissement ?
5. **D5** Format/canal de restitution de la clé publique attendus par l'auditeur ?
6. **Calendrier** : l'auditeur accepte-t-il l'intérim HMAC/Note 11 au 15/07, asymétrique livré après ?

_Réserve : lecture du référentiel faite le 2026-07-13 ; le POS (titulaire de la certif) arbitre
l'interprétation finale, en particulier D2 (modèle de clé) et le périmètre des JET signés côté SaaS._

---

## ⚠️ Note phase pgsodium (POS 2026-07-13) — NE PAS OUBLIER

Le seam « pgsodium = drop-in » est vrai **pour l'Edge** (elle appelle déjà la RPC), mais **PAS pour le
POS** en l'état. Le POS lit AUSSI la clé privée et est câblé **RPC-first avec repli SELECT direct** :
- Aujourd'hui la RPC `nf525_get_signing_material` est grantée **service_role uniquement** → le POS
  (`authenticated`) ne peut pas l'appeler → il retombe sur le SELECT direct (OK tant que c'est en clair).
- Quand pgsodium chiffrera la colonne : le SELECT du POS renverra du **chiffré** ET la RPC lui restera
  **refusée** → **POS CASSÉ**.

**Donc, AVANT/AVEC pgsodium (fast-follow, pas pour le 15/07) :**
1. `GRANT EXECUTE ON FUNCTION nf525_get_signing_material(uuid) TO authenticated;` (en plus de service_role).
2. **Autorisation interne dans la RPC** (SECURITY DEFINER court-circuite les RLS) : ne renvoyer le
   matériel que si le JWT appelant est autorisé pour `p_establishment_id` (pattern `users_organizations`).
   ⚠️ C'est le « authz mal réglée = pire que le clair » — à faire avec soin + cross-test.

Dès que le grant + l'autz sont posés, le POS bascule sur la RPC automatiquement (avant comme après
pgsodium). L'Edge, elle, ne change pas.
