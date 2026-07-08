# Gestion commerciale — flux cible & stack (Logones)

> Document de référence (à reprendre quand on retravaillera le module commercial). État : **réflexion validée, pas encore implémenté.** Rédigé 2026-07, **mis à jour avec la spec API Qonto** (`SPEC_QONTO_API.md`).

## 0. Ce que la spec Qonto a changé
Qonto couvre **beaucoup plus** que la simple banque — c'est quasiment tout le back-office d'encaissement :
- **Facturation** (`POST /v2/client_invoices`) — et **Qonto est Plateforme Agréée (PDP)** → **la contrainte e-invoicing 2026 est levée** (on s'appuie sur Qonto, on ne réimplémente pas la conformité).
- **Prélèvement SEPA récurrent** (SDD) : mandats + subscriptions + collections + webhooks → **remplace GoCardless**.
- **Payment links** pour l'encaissement ponctuel (matériel).
- **Transactions + webhooks** pour le rapprochement.

→ **GoCardless devient OPTIONNEL** (seulement si un jour on veut de la CB ou du non-SEPA). Le stack se simplifie à **Qonto + Yousign + l'app**.

## 1. Contexte & décisions
- **Comptabilité = externe** (expert-comptable à partir des factures d'achat). Pas de logiciel compta interne.
- **Structure holding mère-fille** : gérée par Qonto (1 jeu d'identifiants API par entité).
- On garde le **rapprochement bancaire** (Qonto).
- Paiements clients : **ponctuels** (matériel) **+ récurrents** (abonnements mensuels).
- Besoins : **devis signés électroniquement**, **facture auto + envoi auto**, suivi **impayés par client**, **pipeline par prospect**.

**Décision : quitter Pennylane → Qonto (encaissement/factures/récurrent) + Yousign (signature devis) + l'app (CRM/orchestration).**

## 2. Stack cible (rôles)

| Couche | Outil | Rôle |
|---|---|---|
| Banque + rapprochement | **Qonto** | comptes multi-entités (holding), transactions, webhooks |
| Facturation (émission, **conforme PDP 2026**) | **Qonto** `POST /v2/client_invoices` | émettre + suivre les factures (payée/impayée) |
| Encaissement ponctuel (matériel) | **Qonto** Payment links (ou SDD one-off) | lien de paiement |
| **Abonnements récurrents** | **Qonto SEPA Direct Debit** (mandat + subscription + collection) | prélèvement mensuel + webhooks résultat |
| **Signature électronique des devis** | **Qonto** add-on « Factures clients Plus » (35 €/mois) **OU Yousign** | ⚠️ Qonto propose la e-signature devis en **produit** ; la spec API dit qu'elle n'est **pas exposée par l'API** (sign_url = SDD only). **À VÉRIFIER** : si l'add-on débloque devis+signature par API → Qonto seul ; sinon Yousign pour le flux piloté CRM. |
| CRM / orchestration | **Notre app** | pipeline, devis, déclenchement facture/mandat, consolidation statut/impayés |
| Comptabilité | **Expert-comptable** (externe) | inchangé |
| *(optionnel, futur)* | GoCardless (hors-SEPA/indépendance banque) · Stripe (CB) | écartés tant que 100 % SEPA — le SDD Qonto est **~11–13× moins cher** (fixe ~0,20 € vs %) |

## 3. Flux cible

```
  PROSPECT (leads) — pipeline CRM : nouveau → contacté → qualifié → devis → gagné/perdu
     │
     ▼
  DEVIS (crm_quotes) ──► YOUSIGN (signature prospect) ──► DEVIS SIGNÉ
     │                                                      │
     │                                                      ▼
     │                                        CLIENT SIGNÉ → conversion lead → ORGANIZATION
     │                                        (créer/retrouver le CLIENT QONTO — partagé factures ↔ SDD)
     ▼                                                      │
  ┌──────────────────────────┐          ┌──────────────────┴──────────────────┐
  │ ACHAT PONCTUEL (matériel)│          │ ABONNEMENT MENSUEL (récurrent)         │
  │ Qonto Payment link       │          │ Qonto SDD : POST direct_debit_mandates │
  │  (ou SDD one-off)         │          │  → sign_url → client signe le MANDAT   │
  └───────────┬──────────────┘          │  → webhook mandate `accepted`          │
              │                          └──────────────────┬────────────────────┘
              │                                             ▼
              │                          Cron mensuel sur mandats `approved` :
              │                          POST direct_debit_subscriptions (prélèvement)
              ▼                                             ▼
  FACTURE (POST /v2/client_invoices, conforme PDP) ──► ENVOI AUTO
              │                                             │
              ▼                                             ▼
       Webhook v1/payment-links                Webhook v1/sepa-direct-debit-collections
       (encaissement confirmé)                 (completed / failed / returned / refunded)
              │                                             │
              └─────────────────────┬───────────────────────┘
                                    ▼
              Webhook v1/transactions + v1/client-invoices → RAPPROCHEMENT
                                    │  match référence/montant → facture « payée »
                                    ▼
              CRM : statut paiement par facture/client → « impayés »
                    + pipeline à jour par prospect/client

  ─────────────────────────────────────────────────────────────────
  Banque/rapprochement : QONTO (holding mère-fille, 1 clé API par entité)
  Compta : factures d'achat → EXPERT-COMPTABLE (externe, inchangé)
```

## 4. Points d'intégration (détails dans `SPEC_QONTO_API.md`)
- **Base URL** : prod `https://thirdparty.qonto.com` / sandbox `https://thirdparty-sandbox.staging.qonto.co`. Tout depuis le **backend**.
- **Auth** : **clé API** (`Authorization: login:secret`, pas de Base64) pour la majorité ; **OAuth 2.0 OBLIGATOIRE pour tout le module SDD**.
- **Endpoints clés** : `GET /v2/organization` + `GET /v2/transactions` (rapprochement) ; `POST /v2/client_invoices` (facture) ; `POST /v2/payment_links` (ponctuel) ; `POST /v2/sepa/direct_debit_mandates` → `sign_url` → `POST /v2/sepa/direct_debit_subscriptions` → `GET /v2/sepa/direct_debit_collections` (récurrent).
- **Webhooks** (moteur temps réel) : `v1/transactions`, `v1/client-invoices`, `v1/payment-links`, `v1/sepa-direct-debit-mandates`, `v1/sepa-direct-debit-collections`. Vérifier la signature + endpoint idempotent.
- **Prérequis SDD** : éligibilité activée dans l'app Qonto + **SCI** créé ; clients **partagés** factures ↔ SDD.

## 5. Modèle de données (existant vs à ajouter)
**Existe** : `leads` (pipeline), `organizations`, `crm_quotes`+`crm_quote_items`, `crm_products`, abonnements, pré-facturation.
⚠️ **À nettoyer** : `organizations.pennylane_id` / `leads.pennylane_contact_id` → `qonto_client_id` (le client Qonto est partagé factures ↔ SDD).

**À ajouter (indicatif)** :
- `crm_quotes` : `esign_status` (draft/sent/signed/refused), `esign_provider_id` (Yousign), `signed_at`.
- **Factures** `crm_invoices` : `qonto_invoice_id`, numéro, montant, `status` (draft/sent/paid/overdue/failed), `pdf_url`, `sent_at`, `paid_at`.
- **Abonnements** : `qonto_client_id`, `qonto_mandate_id` (+ statut pending_signature/approved), `qonto_subscription_id`, montant/périodicité, `sign_url`.
- **Collectes/paiements** : statut alimenté par webhooks (`completed`/`failed`/`returned`/`refunded` + `status_reason`), `provider_ref`.

## 6. Réforme e-invoicing 2026-2027 — RÉSOLU
Qonto est **Plateforme Agréée (PDP)**. → on **émet les factures via Qonto** (conforme), l'app **orchestre** (devis, déclenchement, suivi). Plus besoin de réimplémenter la conformité en interne. ✅

## 7. Chantiers priorisés (app)
1. **Migration Pennylane → Qonto** : retirer l'intégration Pennylane (mince : `lib/pennylane/client.ts` + `api/quotes/[id]/send` = client `/company_customers` + devis `/quotes`, one-way). Créer un client Qonto (`lib/qonto/client.ts`) : clé API (READ/factures) + OAuth (SDD). Remplacer les champs `pennylane_*` → `qonto_*`.
2. **Devis + signature (Yousign)** : génération PDF, envoi à signer, webhook signature → `crm_quotes.esign_status = signed`.
3. **Facturation (Qonto)** : entité `crm_invoices`, `POST /v2/client_invoices` (client doit avoir une **currency**), **envoi auto**, suivi via webhook `v1/client-invoices`.
4. **Abonnements SDD (Qonto, OAuth)** : à la signature → `POST direct_debit_mandates` (sign_url) → webhook `accepted` → cron mensuel `POST direct_debit_subscriptions` → webhook `collections`.
5. **Rapprochement + impayés** : webhook `v1/transactions` (match référence/montant → facture payée) ; cron impayés + relances.
6. **Suivi CRM** : « impayés » par client + **pipeline par prospect** (compléter l'existant leads).
7. **Ponctuel (matériel)** : `POST payment_links` + webhook confirmation.
8. **Vue groupe consolidée** : boucle par entité (holding + filiales), agrégation dans le CRM.

## 8. Décisions ouvertes (à trancher à l'implémentation)
- **Récurrent natif vs cron** : la doc montre `schedule_type: "one_off"` — **vérifier sur la page d'endpoint** si un récurrent natif existe ; sinon **cron mensuel** qui crée une subscription par échéance sur mandat `approved`.
- **Prestataire e-signature devis** : Yousign (FR) vs DocuSign.
- **OAuth SDD** : mettre en place le flux OAuth 2.0 + stockage tokens (le reste = clé API).
- **Multi-entités** : 1 couple `login:secret` par entité en secret manager ; mapping entité ↔ organisation dans le CRM.
- **GoCardless/Stripe** : à n'ajouter QUE si besoin CB/non-SEPA (sinon Qonto SDD suffit).
- Re-vérifier chaque schéma requête/réponse (payloads Qonto évoluent).

## 9. Verdict (confirmé par l'analyse comparative financière)
**Qonto = socle unique** : banque (holding) + rapprochement + **facturation conforme PDP** + **prélèvement récurrent SDD** (**tarif entrant CONFIRMÉ, fixe et indépendant du montant** : 0,25 € en Business, 0,10 € en Enterprise/Premium — comparateur officiel Qonto → ~250 % moins cher que Stripe, ~1900 % que GoCardless) + ponctuel (liens/SDD). ⚠️ Ce tarif entrant **n'est PAS dans la grille PDF** (qui ne liste que les prélèvements *sortants*). **GoCardless écarté** (redondant + plus cher tant que 100 % SEPA). **Stripe seulement si CB** (checkout carte / hors-SEPA). Reste **1 seul point ouvert** : la **signature de devis via API** (Qonto add-on vs Yousign, cf. §2). Stack cible : **Qonto (+ add-on Factures clients Plus) + l'app**, Yousign en secours si l'API ne couvre pas la signature devis. Migration Pennylane→Qonto = chantier **contenu**.

## 10. Références
- **`SPEC_QONTO_API.md`** (racine repo) — spec d'intégration complète (auth, endpoints, SDD, webhooks, checklist prod).
- **`ANALYSE_COMPARATIVE_PRESTATAIRES.md`** (racine repo) — Qonto vs Stripe vs GoCardless (tarifs, cas d'usage, reco).
- Doc Qonto : https://docs.qonto.com — SDD : https://docs.qonto.com/api-reference/business-api/payments-transfers/sepa-direct-debit/introduction
