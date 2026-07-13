# NF525 — Stratégie de signature JET (SaaS)

_Rédigé le 2026-07-13, en vue de l'audit du 15/07. Sources : référentiel officiel dans
`_DOC/NF525_Officiel/` (Exigences Produit Partie 10 §6.11.3 / §6.15.1, R19 Dictionnaire JET) et
le code (`nf525_jet_*_saas`, `nf525_signing_keys`)._

## 0. Constat de départ

| | Exigence NF525 (§6.11.3, R19) | Code SaaS actuel |
|---|---|---|
| Hash / condensat | SHA-256+ (SHA-1, MD5, CRC16/32 **interdits** — Note 9) | **SHA-256** ✅ |
| Encodage signature | Base64 URL (R19 §4.1, l.507) | **base64url** ✅ |
| Chaînage | report de la signature précédente (R19) | **oui** (fil `device_id NULL`) ✅ |
| **Type de signature** | **ASYMÉTRIQUE** — clé publique + privée ; RSA-2048 **padding PSS** ou ECDSA-256 min. (§6.11.3, l.2673-2698) | **HMAC-SHA256 = SYMÉTRIQUE** ❌ |
| Confidentialité clé privée | à garantir + documenter (§6.11.3, l.2719) | clé en **clair** dans `nf525_signing_keys`, lisible `service_role` ⚠️ |
| Restitution clé publique | obligatoire (§6.15.1) | N/A (symétrique) ❌ |

**Écart central : le type de signature.** Hash et encodage sont déjà conformes. La signature JET
côté SaaS (`nf525_jet_130/180/290/410_saas`) utilise `HMAC-SHA256(clé_symétrique, hash_chain_input)`.

**Décision retenue (POS + Phil, 2026-07-13)** : soumettre le HMAC en **alternative Note 11**
(§4.3 Annexe 1, évaluation de robustesse) pour l'audit du 15/07 ; planifier l'asymétrique en
chantier séparé. Ce document couvre les 3 volets.

---

## (a) Dossier Note 11 — HMAC-SHA256 comme alternative robuste

**Base réglementaire** : §6.11.3 Note 11 — _« Toute méthodologie de sécurisation qui diffère des
exigences 6.11.3.2 et 6.11.3.3 peut faire l'objet d'une évaluation de robustesse conformément au
§4.3 de l'annexe 1 afin de valider la solution alternative proposée. »_

### Description de la méthode proposée
- **Condensat** : SHA-256 sur la chaîne R19 (champs ordonnés, séparateur `,`) — conforme Note 9.
- **Scellement** : `HMAC-SHA256(clé_secrète_établissement, condensat)`, encodé **base64url**.
- **Chaînage** : chaque événement JET intègre la **signature de l'événement précédent** du même fil
  (`device_id NULL` côté SaaS) → toute altération/suppression casse la chaîne (inaltérabilité R19).
- **Clé** : secret symétrique de 256 bits (32 octets), **une clé active par établissement**
  (`nf525_signing_keys`, `valid_to IS NULL`).

### Arguments de robustesse (à faire valider §4.3)
1. **Force cryptographique** : HMAC-SHA256 est un MAC reconnu (NIST FIPS 198-1, RGS/ANSSI) ; aucune
   forge pratique connue sans la clé. SHA-256 dépasse la liste interdite (Note 9).
2. **Inaltérabilité** : le chaînage des signatures rend toute insertion/suppression/modification
   d'un événement **détectable** (rupture de chaîne) — objectif R19 atteint.
3. **Intégrité vérifiable** : recalcul du HMAC sur `hash_chain_input` stocké → contrôle d'intégrité
   (§6.11.3.4) réalisable.

### Faiblesse assumée + mesures compensatoires (le cœur du dossier §4.3)
> L'évaluateur ciblera **la non-répudiation** : en symétrique, qui vérifie peut aussi **forger**
> (clé unique). C'est la raison d'être de l'exigence asymétrique. Le dossier doit donc démontrer que
> la **confidentialité et le contrôle d'accès de la clé** compensent.

Mesures à mettre en avant (dépend du volet (b)) :
- Clé **jamais exposée** hors du contexte de signature (stockage Vault/chiffré — cf. (b)).
- **Contrôle d'accès strict** : signature via RPC `SECURITY DEFINER` uniquement ; la clé n'est pas
  lisible par les rôles applicatifs.
- **Une seule clé active** par établissement + **événement de changement de trousseau** tracé (R19).
- **Contrôle d'intégrité de la clé** (rejet des valeurs non-base64 — cf. incident `?` en (b)).

⚠️ **À corriger AVANT de déposer le dossier** : aujourd'hui la clé est en **clair** et **lisible par
`service_role`**, et **une clé de test est corrompue** (`?`). En l'état, l'argument « confidentialité
compense » est **fragilisé**. Le volet (b) est donc un **prérequis** à un dossier Note 11 crédible.

---

## (b) Plan de durcissement du stockage de clé

### État actuel (constaté via MCP, 2026-07-13)
- `nf525_signing_keys.signing_key_base64` = secret **en clair**, table lisible par `service_role`.
- Scan des 4 clés : 3 valides (dont **La Plank des Gones** = établissement audité ✅), **1 corrompue**
  (`Établissement de test La Plank`, `eb64c088…`, un caractère `?` — mojibake probable au sync).
- Aucune contrainte n'empêche d'insérer une clé non-base64 (d'où la corruption silencieuse).

### Cible
1. **Rejet des clés invalides** (rapide, à faire tout de suite) — trigger/contrainte :
   ```sql
   alter table nf525_signing_keys
     add constraint nf525_signing_key_base64_chk
     check (signing_key_base64 ~ '^[A-Za-z0-9+/]{43}=$');   -- 32 octets base64
   ```
   → empêche toute future corruption `?`. (À valider : n'ajouter qu'après avoir réparé la clé de test,
   sinon la contrainte échoue à la validation.)
2. **Migration du secret vers Supabase Vault** (pgsodium) : stocker la clé chiffrée, la RPC la
   déchiffre au moment de signer. La clé n'est plus lisible en clair par `service_role`.
3. **Réparation de la clé de test corrompue** — **coordonner POS** : la clé est partagée SaaS↔POS ;
   déterminer si le POS détient la bonne valeur (re-sync) ou si on régénère (test = jetable). Ne PAS
   régénérer à l'aveugle un établissement réel.
4. **Procédure de rotation** documentée + **événement JET « changement de trousseau »** (R19 l.1186).

### Priorité
- (b.1) contrainte anti-corruption : **immédiat**, faible risque.
- (b.3) clé de test : **coordination POS**, avant l'audit si possible.
- (b.2) Vault : **prérequis du dossier Note 11**, à cadrer avec le POS (clé partagée).

---

## (c) Cadrage du chantier « signature asymétrique » (moyen terme)

### Décision d'algorithme
- **ECDSA P-256** (recommandé) : signatures courtes, rapides, conforme « ECDSA 256 bits » (§6.11.3).
- ou **RSA-2048 padding PSS** (conforme, mais signatures plus lourdes).
- ❌ Ed25519 (pgsodium) : EdDSA, **pas** nommé par la norme → nécessiterait *encore* une Note 11.

### Impact architectural majeur : la signature sort de la base
- `pgcrypto` **ne fournit pas** RSA-PSS/ECDSA. → signer **dans du code applicatif** :
  - **Node** (`crypto.sign`, RSA-PSS/ECDSA) dans la route API, ou
  - **Supabase Edge Function** (Deno WebCrypto ECDSA P-256).
- **Conséquence** : le **trigger DB `trg_nf525_jet_410_establishment`** (source unique inviolable
  qu'on a posé) **ne peut plus signer en base** → retour à une signature côté app pour le 410
  (rouvre la question du contournement `useUpdateEstablishment`, à re-sécuriser autrement).

### Modèle de clé
- **Paire par établissement** : privée (signe) + publique (vérifie).
- **Clé privée** : Vault/KMS, jamais en clair (§6.11.3 l.2719). **Clé publique** : stockée + **endpoint
  de restitution** (§6.15.1).
- **Trancher avec le POS** : clé partagée SaaS↔POS ou **une paire par côté** ? (pivot de tout le design).

### Migration des événements
- Loguer un **événement « changement de trousseau de clés »** (R19 l.1186-1188).
- Anciens events HMAC = **historiques** ; nouveaux = asymétriques.
- **Outil de vérification bi-ère** (HMAC avant / asymétrique après).

### Lots de travail (T-shirt sizing)
| Lot | Contenu | Taille |
|---|---|---|
| L1 | Choix algo + génération/stockage paire (Vault/KMS) | M |
| L2 | Service de signature (Edge Function ou route Node) + refonte du 410 hors trigger | L |
| L3 | Restitution clé publique (§6.15.1) + outil de contrôle d'intégrité (§6.11.3.4) | M |
| L4 | Migration : event changement de trousseau + vérif bi-ère | M |
| L5 | Coordination POS (clé partagée/séparée, périmètre des JET signés) + tests | M |

**Estimation** : **pas un chantier de 2 jours** — plusieurs semaines, à planifier après l'audit.

---

## Synthèse décisionnelle
- **Audit 15/07** : dossier **Note 11 / HMAC** (a) + durcissement clé minimal (b.1, b.3). ✅ non bloquant.
- **Prérequis crédibilité Note 11** : Vault (b.2) — à lancer vite.
- **Moyen terme** : asymétrique (c) — vrai projet, coordination POS obligatoire sur le modèle de clé.

_Réserve d'honnêteté : lecture du référentiel faite le 2026-07-13 ; le POS est titulaire de la
certification et arbitre l'interprétation finale (périmètre des JET SaaS, acceptation Note 11)._
