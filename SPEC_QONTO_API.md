# Spec d'intégration — API Qonto ↔ CRM Logones

> Document de référence pour l'implémentation. Destiné à être fourni à un IDE / assistant de code.
> Vérifié sur la doc officielle Qonto (docs.qonto.com) — juillet 2026.
> Toujours reconfirmer les schémas exacts de requête/réponse sur la page d'endpoint correspondante avant de coder.

---

## 1. Contexte & périmètre

Le CRM accède aux **comptes Qonto de l'entreprise elle-même** (holding Logones + filiales).
C'est le cas d'usage « **Automate your own workflows** » de Qonto :

- **Aucune validation Qonto requise**, aucun agrément AIS/PIS PSD2 nécessaire (ceux-ci ne concernent que l'accès aux comptes de **tiers**).
- Authentification par **clé API** possible pour la majorité des endpoints.
- **OAuth 2.0 obligatoire** uniquement pour les endpoints « sensibles », notamment **tout le module Prélèvement SEPA (SDD)** et certaines opérations de paiement.

### Objectifs fonctionnels du CRM couverts par l'API

| Besoin CRM | Couvert par l'API Qonto ? |
|---|---|
| Rapprochement bancaire automatique | ✅ Transactions + Webhooks |
| Suivi factures payées / impayées | ✅ Client invoices + Webhooks |
| Émission de factures depuis le CRM | ✅ `POST /v2/client_invoices` |
| Encaissement ponctuel (achat matériel) | ✅ Payment links **ou** SDD one-off |
| Abonnements mensuels récurrents | ✅ SEPA Direct Debit (mandat + subscriptions) |
| Paiements sortants (fournisseurs) | ✅ SEPA transfers / bulk / recurring |
| Vue consolidée multi-entités (groupe) | ✅ 1 jeu d'identifiants par organisation |
| **Signature électronique d'un devis** par le prospect | ⚠️ **Hors API Qonto** — à gérer côté CRM (voir §9) |
| Pipeline commercial / statut prospect | ⚠️ **Hors API Qonto** — logique propre au CRM |

---

## 2. Environnements & URLs de base

| Environnement | Base URL |
|---|---|
| **Production** | `https://thirdparty.qonto.com` |
| **Sandbox** | `https://thirdparty-sandbox.staging.qonto.co` |

- Toutes les requêtes en **HTTPS** uniquement.
- Toutes les requêtes doivent partir de **ton backend** (jamais du navigateur), sauf l'endpoint d'autorisation OAuth `/v2/oauth2/auth`.
- Réponses toujours en **JSON** (y compris les erreurs).
- Sandbox : ajouter le header `X-Qonto-Staging-Token` (voir doc « Accessing the Sandbox environment »).
- Créer le compte Sandbox via le Developer Portal : https://developers.qonto.com

---

## 3. Authentification

### 3.1 Clé API (recommandé pour l'accès à tes propres comptes)

Header (⚠️ **PAS** du Basic Auth, **pas de Base64**) — simple concaténation `login:secret` :

```
Authorization: {sign-in}:{secret-key}
```

Exemple :

```bash
curl --location --globoff 'https://thirdparty.qonto.com/v2/organization' \
  --header 'Authorization: pied-piper-7132:62885d39f3a0ddedd3d3ee0432a43ccr'
```

- La clé se génère dans l'app Qonto : **Intégrations et Partenariats → Clé API**.
- **Une clé par organisation.** Pour la holding + chaque filiale, prévoir un stockage sécurisé (secret manager) d'un couple `login:secret` par entité, et une boucle d'appels par entité pour consolider.

### 3.2 OAuth 2.0 (obligatoire pour les endpoints sensibles)

Nécessaire pour :
- **SEPA Direct Debit** (tout le module `sepa_direct_debit.*`) — OAuth **uniquement**.
- Restreindre finement les scopes, ou opérer certaines actions de paiement.

Gérer les credentials OAuth depuis le **Developer Portal** : https://developers.qonto.com

Scopes utiles pour ce projet :

| Scope | Usage |
|---|---|
| `organization.read` | Lire organisation + comptes |
| `client.read` / `client.write` | Gérer les clients (partagés factures ↔ SDD) |
| `client_invoices.read` / `client_invoice.write` | Lire / créer factures clients |
| `sepa_direct_debit.read` / `sepa_direct_debit.write` | Prélèvements (mandats, subscriptions, collections) |
| `payment.write` | Paiements sortants |
| `attachment.write` | Joindre des justificatifs |

---

## 4. Conventions transverses

- **Versioning** : endpoints préfixés `/v2/`. Toujours cibler explicitement la version.
- **Pagination** : paramètres `page` et `per_page` ; lire l'objet `meta` de la réponse pour le nombre total de pages.
- **Idempotence** : utiliser une clé d'idempotence sur les créations de paiement pour éviter les doublons (voir doc « Idempotent requests »).
- **Rate limits** : respecter les limites (voir doc « Rate limitations ») — prévoir backoff/retry.
- **SCA (Strong Customer Authentication)** : requise sur la plupart des paiements sortants. Contournable pour les **bénéficiaires de confiance** (`trusted`) → indispensable pour l'automatisation sans intervention humaine.
- **Erreurs** : JSON standardisé ; gérer au minimum 401 (auth), 422 (validation), 429 (rate limit).

---

## 5. Lecture des données (READ)

### 5.1 Organisation & comptes

| Endpoint | Usage |
|---|---|
| `GET /v2/organization` | Détails organisation + liste des comptes bancaires (point de départ pour récupérer les `bank_account_id` / IBAN) |
| `GET /v2/bank_accounts` | Liste paginée des comptes |
| `GET /v2/bank_accounts/{id}` | Solde à jour + détails d'un compte |

### 5.2 Transactions (cœur du rapprochement)

| Endpoint | Usage |
|---|---|
| `GET /v2/transactions` | Liste ; paramètre requis `bank_account_id` **ou** `iban`. Filtres : statut, plage de dates, type d'opération. Tri + pagination. |
| `GET /v2/transactions/{id}` | Détail d'une transaction |
| `GET /v2/statements` | Relevés bancaires |

- Utiliser `includes[]` pour embarquer **attachments**, **labels** et **VAT details** dans la réponse (évite des allers-retours).
- Séquence type : `GET /v2/organization` → récupérer les `bank_account_id` → `GET /v2/transactions?bank_account_id=...`.

### 5.3 Autres ressources lisibles

- Factures clients (statut payée/impayée), devis & avoirs (`client-quotes-notes`).
- Bénéficiaires SEPA, cartes, membres (memberships).
- Mandats & collections SEPA Direct Debit.

---

## 6. Écriture / automatisations (WRITE)

### 6.1 Créer une facture client

```
POST /v2/client_invoices     (scope: client_invoice.write)
```

- Disponible sur tous les forfaits Qonto.
- La facture **hérite de la `currency` du client** ; si le client n'a pas de devise → erreur de validation sur `/data/attributes/currency`. → S'assurer que le client a une devise avant l'appel.

### 6.2 Paiements sortants (fournisseurs, salaires)

| Endpoint | Usage |
|---|---|
| `POST /v2/sepa/transfers` | Virement SEPA unitaire |
| `POST /v2/sepa/bulk_transfers` | Jusqu'à 400 virements (asynchrone, à poller) |
| `POST /v2/sepa/recurring_transfers` | Virements récurrents |
| `GET /v2/sepa/beneficiaries` | Lister bénéficiaires |
| `POST /v2/sepa/beneficiaries` | Ajouter |
| `PATCH /v2/sepa/beneficiaries/trust` | Marquer « de confiance » (bypass SCA) |
| `GET /v2/sepa/transfers` · `GET /v2/sepa/transfers/{id}` · `POST /v2/sepa/transfers/{id}/cancel` | Suivi / annulation |

> ⚠️ **`external transfers` est supprimé le 31 mars 2026.** Utiliser exclusivement les endpoints `/v2/sepa/*`.

### 6.3 Encaissement ponctuel — Payment links

| Endpoint | Usage |
|---|---|
| `POST /v2/payment_links/connections` | Connecter le provider de paiement |
| `POST /v2/payment_links` | Créer un lien de paiement (ex. achat de matériel) |
| `GET /v2/payment_links/{id}/payments` | Suivre les paiements |

---

## 7. Abonnements mensuels — SEPA Direct Debit (SDD)

> **OAuth obligatoire.** Prérequis : être **éligible au SDD** et avoir activé la fonctionnalité dans l'app Qonto
> (**Compte pro → Prélèvements entrants**), ce qui crée ton **SCI** (SEPA Creditor Identifier).
> Les **clients sont partagés** entre le module Factures et le module Prélèvements.

### Flux complet

**1. Créer un mandat** (autorisation du client à être prélevé)

```
POST /v2/sepa/direct_debit_mandates     (scope: sepa_direct_debit.write)
```

```json
{
  "direct_debit_mandate": {
    "client_id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "payment_info": {
      "first_payment": {
        "collection_date": "2026-01-01",
        "amount": { "value": "250.00", "currency": "EUR" },
        "reference": "INV-2025-001"
      },
      "notify_client": true,
      "schedule_type": "one_off"
    },
    "send_mandate_signature_email": true
  }
}
```

- Si `payment_info` est fourni → la réponse renvoie un **`sign_url`** : le lien que le client visite pour **signer le mandat électroniquement**. Qonto peut envoyer l'email de signature automatiquement (`send_mandate_signature_email: true`), sinon tu envoies l'URL toi-même.
- Si `payment_info` est omis → mandat seul, pas de `sign_url`.
- Statuts de mandat : `pending_signature` → `approved` (une fois signé).

**2. Attendre la signature**
- Webhook `v1/sepa-direct-debit-mandates`, event `accepted` (recommandé), **ou** polling `GET /v2/sepa/direct_debit_mandates/{id}`.
- Lister les mandats d'un client : `GET /v2/sepa/direct_debit_mandates?client_id={id}`.

**3. Déclencher un prélèvement** (subscription = une demande de paiement sur un mandat)

```
POST /v2/sepa/direct_debit_subscriptions     (scope: sepa_direct_debit.write)
```

```json
{
  "direct_debit_subscription": {
    "client_id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "direct_debit_mandate_id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    "bank_account_id": "497f6eca-6276-4993-bfeb-53cbbbba6f09",
    "initial_collection_date": "2026-01-01",
    "amount": { "value": "250.00", "currency": "EUR" },
    "reference": "INV-2025-001",
    "notify_client": true,
    "schedule_type": "one_off"
  }
}
```

- **Mandat + prélèvement en une étape** : omettre `direct_debit_mandate_id` → un mandat est créé et la réponse contient un `sign_url`.
- Récupérer / lister : `GET /v2/sepa/direct_debit_subscriptions/{id}` · `GET /v2/sepa/direct_debit_subscriptions`.

> **Note pour les abonnements mensuels** : la doc décrit `schedule_type: "one_off"`.
> Vérifier sur la page d'endpoint les valeurs de `schedule_type` supportées pour du récurrent natif ;
> à défaut, le CRM planifie lui-même une subscription par échéance (cron mensuel sur mandat signé).

**4. Suivre le résultat de la collecte**

```
GET /v2/sepa/direct_debit_collections/{id}
GET /v2/sepa/direct_debit_collections?direct_debit_subscription_id={id}
```

Statuts de collecte : `pending`, `completed`, `declined`, `rejected`, `canceled`, `returned` (rejet banque débiteur ~D+5), `refunded` (contestation ~8 semaines).
En cas d'échec, `status_reason` précise (`insufficient_funds`, `amount_limit_reached`, `account_closed`, …).

### Tableau récap SDD

| Étape | Endpoint |
|---|---|
| Créer un mandat | `POST /v2/sepa/direct_debit_mandates` |
| Lire un mandat | `GET /v2/sepa/direct_debit_mandates/{id}` |
| Lister mandats (par client) | `GET /v2/sepa/direct_debit_mandates?client_id={id}` |
| Créer une subscription | `POST /v2/sepa/direct_debit_subscriptions` |
| Lire / lister subscriptions | `GET /v2/sepa/direct_debit_subscriptions[/{id}]` |
| Lire / lister collectes | `GET /v2/sepa/direct_debit_collections[/{id}]` |

---

## 8. Webhooks (temps réel → moteur d'automatisation du CRM)

Configuration : voir doc « Webhooks » (Business API). Vérifier la signature des payloads entrants.

Topics pertinents :

| Topic | Déclenche dans le CRM |
|---|---|
| `v1/transactions` | Rapprochement auto : matcher montant + référence → facture « payée » |
| `v1/client-invoices` | Mise à jour statut facture |
| `v1/payment-links` | Confirmation encaissement ponctuel (matériel) |
| `v1/sepa-direct-debit-mandates` | Mandat signé (`accepted`) → activer l'abonnement dans le pipeline |
| `v1/sepa-direct-debit-collections` | Résultat prélèvement (`completed` / `failed` / `returned` / `refunded`) → relance ou statut à jour |
| `v1/accounts`, `v1/organizations` | Changements de compte/organisation |
| `v1/memberships`, `v1/cards`, `v1/beneficiaries` | Équipe, cartes, bénéficiaires |
| `v1/consent-revocations`, `v1/payment-links-connections` | Révocation de consentement, connexions payment links |

Exemple de payload `v1/sepa-direct-debit-collections` (échec) :

```json
{
  "type": "v1/sepa-direct-debit-collections",
  "organization_id": "…",
  "created_at": "2026-01-01T10:55:00Z",
  "data": {
    "event": "failed",
    "id": "…",
    "direct_debit_subscription_id": "…",
    "amount": { "value": "250.00", "currency": "EUR" },
    "reference": "INV-2025-001",
    "status": "rejected",
    "status_reason": "insufficient_funds"
  }
}
```

> Pour `failed`, `data.status` conserve la valeur fine (`declined` / `rejected` / `canceled`).

---

## 9. Automatisations cibles — mapping fonctionnel

| Automatisation CRM | Séquence |
|---|---|
| **Rapprochement bancaire** | Webhook `v1/transactions` → matcher `reference`/montant sur factures ouvertes → passer la facture en « payée » |
| **Détection d'impayés / relances** | Cron : lister `client_invoices` non réglées + croiser transactions → relancer si échéance dépassée |
| **Signature d'un abonnement** | À la signature commerciale : `POST direct_debit_mandates` (avec `sign_url`) → email de signature → webhook `accepted` → activer l'abonnement |
| **Prélèvement mensuel** | Cron mensuel sur mandats `approved` → `POST direct_debit_subscriptions` → webhook `collections` (`completed`/`failed`) → MAJ pipeline |
| **Achat de matériel (ponctuel)** | `POST payment_links` **ou** subscription SDD one-off → webhook confirmation |
| **Facturation** | À l'événement métier → `POST /v2/client_invoices` → suivi via `v1/client-invoices` |
| **Vue groupe consolidée** | Boucle sur chaque organisation (holding + filiales) : `GET /v2/organization` + `GET /v2/transactions` → agrégation CRM |

### Signature électronique des **devis** (prospect)

L'API Qonto **ne gère pas** la signature d'un devis par le prospect (le `sign_url` existe seulement pour les **mandats SDD**).
→ Faire signer le devis via un outil d'e-signature côté CRM (Yousign, DocuSign, etc.), puis, à la signature :
1. créer la facture Qonto (`POST /v2/client_invoices`), et/ou
2. créer le mandat SDD si abonnement (`POST /v2/sepa/direct_debit_mandates`).

---

## 10. Points de vigilance (checklist avant prod)

- [ ] Clé API stockée en secret manager, **une par entité** (holding + filiales).
- [ ] Passer en **OAuth** pour le module SDD (non accessible par clé API).
- [ ] **Éligibilité SDD activée** dans l'app + **SCI** créé.
- [ ] Bénéficiaires de paiements sortants marqués **`trusted`** pour automatiser sans SCA.
- [ ] Ne plus utiliser `external transfers` (**sunset 31/03/2026**) → `/v2/sepa/*`.
- [ ] **Idempotency keys** sur toutes les créations de paiement.
- [ ] **Backoff/retry** sur 429 (rate limits).
- [ ] **Vérification de signature** des webhooks + endpoint idempotent côté réception.
- [ ] Tout tester en **Sandbox** (`thirdparty-sandbox.staging.qonto.co` + `X-Qonto-Staging-Token`) avant prod.
- [ ] **Facture électronique 2026** : Qonto est Plateforme Agréée (PDP) — envisager de s'appuyer dessus plutôt que réimplémenter la conformité.
- [ ] Re-vérifier chaque schéma requête/réponse sur la page d'endpoint (les payloads évoluent).

---

## 11. Liens de référence

- Introduction API : https://docs.qonto.com/api-reference/introduction
- Get started (cas d'usage & auth) : https://docs.qonto.com/get-started/general/introduction
- Clé API : https://docs.qonto.com/get-started/business-api/authentication/api-key
- SEPA Direct Debit : https://docs.qonto.com/api-reference/business-api/payments-transfers/sepa-direct-debit/introduction
- Créer une facture client : https://docs.qonto.com/api-reference/business-api/expense-management/client-quotes-notes/client-invoices/create-a-client-invoice
- Lister les transactions : https://docs.qonto.com/api-reference/business-api/transactions-statements/transactions/list-transactions
- Webhooks (topics supportés) : https://docs.qonto.com/api-reference/business-api/webhooks/overview
- Collection Postman : https://www.postman.com/qontoteam/qonto-public-api
- Index complet de la doc : https://docs.qonto.com/llms.txt
