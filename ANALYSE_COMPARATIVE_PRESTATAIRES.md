# Qonto vs Stripe vs GoCardless — Analyse comparative selon tes besoins

> Contexte : holding Logones (structure mère-fille), CRM développé en interne via API.
> Besoins : rapprochement bancaire, encaissement ponctuel (matériel), **abonnements mensuels récurrents**, devis + signature électronique + facturation auto, suivi impayés/pipeline.
> Hypothèse validée : **clients d'abonnement en zone SEPA uniquement (France/UE)**.
> Sources tarifaires : grille Qonto « Offres et tarifs » du 20/04/2026 + pages tarifs Stripe & GoCardless (juillet 2026). Voir §8.
>
> ✅ **RÉSOLU (voir §11)** : la signature de devis **n'est PAS exposée par l'API Qonto** (vérifié sur `docs.qonto.com/llms.txt` : ressource *quotes* sans endpoint de signature ; `sign_url` = mandats SDD uniquement). → **Yousign retenu** pour la signature pilotée par le CRM. La §11 fait foi pour toutes les décisions/chiffrages à jour ; les §1–§9 ci-dessous sont l'analyse d'origine (conservée pour le raisonnement).

---

## 1. En une phrase

Les trois ne jouent pas le même rôle : **Qonto est ton socle bancaire + facturation + prélèvement SEPA**, **Stripe est un processeur de paiement carte / billing** (utile seulement si tu encaisses par carte), **GoCardless est un spécialiste du prélèvement multi-pays** (peu d'intérêt car tu es 100 % SEPA). Pour des abonnements SEPA, **Qonto est de très loin le moins cher** grâce à son tarif **fixe par prélèvement** (≈ 0,20 €) au lieu d'un **pourcentage** chez Stripe et GoCardless.

---

## 2. Positionnement — ce ne sont pas 3 concurrents directs

| | Qonto | Stripe | GoCardless |
|---|---|---|---|
| **Nature** | Néobanque pro (compte + IBAN) | Processeur de paiement / plateforme dev | Spécialiste du prélèvement bancaire |
| **Rôle principal** | Socle : banque, cartes, facturation, tréso, virements, prélèvement SEPA | Encaissement **carte** en ligne + **billing/abonnements** + international | Encaissement par **prélèvement** récurrent (SEPA, Bacs UK, ACH US) |
| **Compte bancaire / IBAN** | ✅ Oui (multi-entités, sous-comptes) | ❌ Non (solde Stripe, payout vers ta banque) | ❌ Non |
| **Rapprochement bancaire** | ✅ Natif | ❌ (données de paiement seulement) | ❌ |
| **Devis + facture + e-signature** | ✅ (via add-on, voir §5) | Partiel (Invoicing, pas de devis FR) | ❌ |
| **Cœur de métier** | Opérations financières de l'entreprise | Paiement carte & SaaS billing | Recouvrement par prélèvement |

**Conclusion de cadrage** : Qonto couvre le plus large. Stripe et GoCardless ne se justifient qu'en **complément ciblé**, pas en remplacement.

---

## 3. Tes besoins → quel outil

| Besoin | Meilleur choix | Pourquoi |
|---|---|---|
| Compte pro multi-entités (holding + filiales) | **Qonto** | Seul à offrir des comptes/IBAN + vue groupe |
| Rapprochement bancaire | **Qonto** | Natif ; Stripe/GC ne voient que leurs propres flux |
| Virements fournisseurs / salaires | **Qonto** | Inclus dans les forfaits (quotas + 0,10–0,20 €/transac au-delà) |
| **Abonnements mensuels (SEPA)** | **Qonto (SDD)** | Tarif **fixe** ~0,20 € vs % chez les autres → voir §4 |
| Devis + signature électronique + facture auto | **Qonto** (add-on Factures clients Plus) | Signature e des devis + factures récurrentes + relances |
| Encaissement ponctuel matériel — **par virement/lien** | **Qonto** | Liens de paiement inclus |
| Encaissement ponctuel matériel — **par carte** | **Stripe** (ou Qonto Tap to Pay / liens) | Voir le cas « carte » §6 |
| CRM via API | **Qonto** (+ Stripe si carte) | API Qonto couvre banque/facture/SDD ; Stripe = meilleure API carte |
| Prélèvement hors SEPA (UK/US) | GoCardless / Stripe | ❌ Non pertinent (100 % SEPA) |

---

## 4. Le point décisif : coût du prélèvement récurrent SEPA

- **Qonto** : **frais FIXE par prélèvement encaissé, indépendant du montant** — **CONFIRMÉ** par le comparateur officiel Qonto (tarifs publics au 16/03/2026) :

  | Forfait | Prélèvement SEPA **entrant** |
  |---|---|
  | Basic / Smart | **0,40 €** |
  | Essential / Business | **0,25 €** |
  | Premium / Enterprise | **0,10 €** |

  Prix **indépendant du montant** (vérifié : 150 € comme 500 € → même frais). Pour le forfait cible **Business : 0,25 €**.
- **GoCardless** : **1 % + 0,20 €** par transaction (plafond 2 €/transac dans le comparateur Qonto).
- **Stripe** : **~0,35 € fixe** par prélèvement SEPA (chiffre du comparateur Qonto ; la grille Stripe publique affiche 0,8 % plafonné 5 €). +0,7 % si **Stripe Billing** (évitable si l'abonnement est géré dans ton CRM).

### Coût d'UN prélèvement mensuel (hypothèse Qonto = 0,20 € fixe)

| Montant de l'abonnement | Qonto | GoCardless | Stripe (SEPA seul) |
|---|---|---|---|
| 50 € | **0,20 €** | 0,70 € | 0,70 € |
| 100 € | **0,20 €** | 1,20 € | 1,10 € |
| 250 € | **0,20 €** | 2,70 € | 2,30 € |
| 500 € | **0,20 €** | 5,20 € | 4,30 € |

### Projection annuelle (abonnement 250 €/mois)

| | Qonto | GoCardless | Stripe |
|---|---|---|---|
| **Par client / an** (×12) | **2,40 €** | 32,40 € | 27,60 € |
| **50 clients / an** | **120 €** | 1 620 € | 1 380 € |

> À volume et montant équivalents, Qonto revient **~13× moins cher** que GoCardless et **~11× moins cher** que Stripe sur l'encaissement récurrent SEPA. Plus le montant est élevé, plus l'écart se creuse (Qonto fixe, les autres proportionnels).

**Nuances :**
- Le prix du **SDD entrant Qonto n'est PAS dans la grille PDF** (qui ne liste que les prélèvements *sortants*) mais est **CONFIRMÉ par le comparateur officiel Qonto** : 0,10 € (Premium/Enterprise) / 0,25 € (Essential/Business) / 0,40 € (Basic/Smart), fixe. *(estimations non contractuelles, éligibilité requise.)*
- **Éligibilité requise** : activer « Prélèvements entrants » + créer le SCI.
- Stripe/GoCardless offrent un **recouvrement plus sophistiqué** (retries auto type *Success+* chez GC, dunning chez Stripe). Si le CRM gère les relances, cet avantage s'efface.

---

## 5. Facturation, devis & signature électronique

Qonto gère la **signature électronique des devis** via le module payant **« Gestion des factures clients Plus »** (35 €/mois annuel, tous forfaits), qui inclut : factures récurrentes automatisées ; **signatures électroniques illimitées pour les devis** ; rappels de paiement personnalisés ; personnalisation avancée des devis/factures ; encaissement illimité des factures.

| | Qonto | Stripe | GoCardless |
|---|---|---|---|
| Devis (format FR) | ✅ | ❌ | ❌ |
| **Signature e du devis** | ✅ (add-on) — *API à vérifier, cf. §0* | ❌ | ❌ |
| Facture auto + envoi + relance | ✅ | ✅ (Invoicing) | ❌ |
| Facture ↔ transaction rapprochée | ✅ natif | ❌ | ❌ |
| Conformité e-invoicing 2026 (PDP) | ✅ Plateforme Agréée | ❌ | ❌ |

---

## 6. Le cas « carte » — seul vrai argument pour Stripe

Qonto n'est pas un processeur carte : liens de paiement (via partenaire) + Tap to Pay, mais pas un checkout carte complet.

**Prends Stripe SI** : checkout carte en ligne intégré ; clients qui paient par carte ; futurs clients hors SEPA ; API carte très mature.
**Coûts carte Stripe (UE)** : **1,5 % + 0,25 €** / transaction. Litiges 15 €, échec 3,50 €.
**Reste Qonto seul SI** : clients par virement + prélèvement SEPA ; matériel via lien Qonto ou SDD ponctuel.

> Matériel 1 000 € : carte Stripe = **15,25 €** ; prélèvement SEPA Qonto = **~0,20 €**. La carte ne se justifie que si le client l'exige ou pour l'immédiateté.

---

## 7. Architecture recommandée

**Scénario A — 100 % SEPA (cas actuel, le moins cher) :** Qonto socle unique (comptes multi-entités + rapprochement ; facturation + devis e-signés add-on ; abonnements SDD ~0,20 € ; matériel via lien/SDD ponctuel ; virements sortants). CRM orchestre via API (clé API + OAuth pour SDD).

**Scénario B — si encaissement carte :** Qonto (banque + facturation + SEPA) + **Stripe** uniquement pour la CARTE (payouts reversés sur Qonto, à rapprocher). GoCardless non retenu.

**Quand reconsidérer GoCardless** : uniquement prélèvement UK (Bacs) / US (ACH), ou moteur de relance/retry avancé à grande échelle.

---

## 8. Synthèse tarifaire

| Poste | Qonto | Stripe | GoCardless |
|---|---|---|---|
| Abonnement mensuel outil | 9–199 €/mois selon forfait (+add-ons) | 0 € (à l'usage) | 0 € standard (add-ons payants) |
| Prélèvement SEPA (encaissement) | **0,10 / 0,25 / 0,40 € fixe** (Enterprise-Premium / Business-Essential / Smart-Basic) — *confirmé comparateur Qonto* | ~0,35 € fixe (0,8 % plafonné 5 € en grille publique) | 1 % + 0,20 € (plafond 2 €) |
| Plafond / transaction SDD | (à confirmer) | 10 000 € | 5 000 € |
| Paiement carte (UE) | via liens/Tap to Pay (partenaire) | 1,5 % + 0,25 € | — |
| Billing abonnements | inclus (add-on) | +0,7 % si Stripe Billing | — |
| Virement SEPA sortant | quotas inclus, puis 0,10–0,20 € | — | — |
| Échec de prélèvement | (à confirmer) | 3,50 € | frais de rejet |
| Add-ons notables | Factures clients Plus 35 €/mois (e-signature devis) | — | Pages perso 200 €/mois, nom sur relevé 50 €/mois |

> Note holding : Qonto se facture **par organisation** → 1 forfait par entité + l'add-on facturation là où tu émets des devis/factures.

---

## 9. Recommandation

1. **Qonto comme socle** + abonnements mensuels sur **prélèvement SEPA Qonto**. Prix SDD entrant **CONFIRMÉ** (0,25 € fixe en Business ; jusqu'à ~250 % moins cher que Stripe et ~1900 % que GoCardless d'après le comparateur Qonto). Reste à activer l'éligibilité + créer le SCI/ICS.
2. ~~Add-on « Gestion des factures clients Plus »~~ **ÉCARTÉ (cf. §11.2)** : signature devis via **Yousign** (l'API Qonto ne l'expose pas) ; facturation de base déjà incluse et **sans plafond** dans les forfaits.
3. **Stripe seulement si CB** (checkout web, immédiateté, hors SEPA).
4. **GoCardless écarté** tant que 100 % SEPA (redondant + plus cher). Rouvrir si Bacs/ACH.
5. **CRM** orchestre via l'API Qonto (clé API + OAuth SDD) ; API Stripe seulement si option carte.

---

## 11. Décisions & chiffrage retenus (échange 2026-07, EN COURS DE DÉCISION)

> Section de synthèse de la conversation — l'utilisateur décide encore. Rien n'est engagé.

### 11.1 Ce qui est confirmé
- **Prélèvement SEPA ENTRANT Qonto = tarif FIXE, indépendant du montant** (comparateur officiel Qonto, tarifs publics 16/03/2026) : **0,40 €** Basic/Smart · **0,25 €** Essential/Business · **0,10 €** Premium/Enterprise. ⚠️ Ce prix n'est **pas** dans la grille PDF « Compte et services de paiement » (qui ne liste que les prélèvements *sortants* +0,10/0,15/0,20 €). Vérifié : 150 € comme 500 € de montant → même frais.
- Comparateur Qonto (200 transac/mois) : **Qonto Enterprise 20 €/mois** vs **Stripe 70 €** (+250 %) vs **GoCardless 400 €** (+1900 %).
- **Signature de devis via l'API Qonto = NON exposée.** Vérifié sur `docs.qonto.com/llms.txt` : l'API a bien une ressource *quotes* (create/update/delete/list/retrieve/**send via email**) mais **aucun endpoint de signature** ni `sign_url` devis — le seul `sign_url` concerne les mandats SDD. → **Yousign retenu** pour la signature pilotée par le CRM.
- **Structure : UN SEUL compte bancaire Qonto** (pas de holding/filiale à bancariser côté Qonto). Qonto facture par entité → un seul forfait.

### 11.2 Forfaits recommandés
- **Qonto : Essential (49 €/mois HT) au démarrage → Business (99 €/mois HT) en croissance.** Le SDD entrant est à **0,25 € sur les deux** ; Business n'apporte que du confort (500 virements sortants vs 250, 29 sous-comptes vs 9, support prioritaire, dashboard avancé). Changement de forfait mensuel, sans engagement.
  - **Pas Enterprise** (199 €) tant que < **~667 collectes/mois** (point de bascule : Enterprise économise 0,15 €/collecte mais coûte +1 200 €/an).
  - Si l'entité opérationnelle était une micro-entreprise (et non une société), Smart 19 € serait possible mais à **0,40 €** de SDD entrant.
- **Add-on « Factures clients Plus » (35 €/mois) : ÉCARTÉ.** Sa valeur principale (e-signature devis) passe par Yousign ; la facturation de base (création/envoi/relances/archivage **conforme PDP**) est déjà incluse dans les forfaits Équipes. ⚠️ Seul point à confirmer : que le forfait de base ne **plafonne pas** le nombre de factures encaissées.
- **Yousign : le palier API (API Plus, 1 248 €/an, 500 signatures/an, 2 €/signature au-delà) est le plancher pour un flux piloté CRM.** Voie progressive possible : démarrer en plan **applicatif** (One ~108 €/an = 10 sig/mois **manuel**, ou Plus ~276 €/an illimité manuel) puis basculer sur l'API quand le volume le justifie.

### 11.3 Coût par client (12 mensualités/an, compte Qonto unique)
- **Coût MARGINAL d'un client = 3,00 €/an** (12 × 0,25 € de SDD entrant), **quel que soit le montant de l'abonnement** (fixe, pas de %). + 1 signature Yousign à la souscription (0 € dans le quota, sinon 2 €).
- **Coût COMPLET par client** (fixe amorti — Business 1 188 € + Yousign API 1 248 € = **2 436 €/an** de fixe) :

  | Nb clients | Coût complet /client/an |
  |---|---|
  | 10 | ≈ 247 € |
  | 25 | ≈ 100 € |
  | 50 | ≈ 52 € |
  | 100 | ≈ 27 € |
  | 150 | ≈ 19 € |
  | 200 | ≈ 15 € |
  | 300 | ≈ 11 € |

  En dessous de ~25 clients c'est le **fixe** qui domine ; au-delà de ~100 clients, chaque client marginal ne coûte plus que **3 €/an**.

### 11.4 Plan de montée en charge (progressif) — recalé sur ~50 devis manuels/mois
> Hypothèse validée par l'utilisateur : gérer jusqu'à **50 signatures manuelles/mois** est raisonnable. ⇒ le plan Yousign de départ n'est PAS « One » (10 sig/mois, trop petit) mais **Plus « application »** (signatures illimitées en manuel, ~276 €/an).

| Phase | Déclencheur d'entrée | Qonto | Yousign | Fixe/an |
|---|---|---|---|---|
| **Démarrage** | lancement | Essential (588 €) | **Plus app** manuel (276 €) | **≈ 864 €** |
| **Automatisation** | manuel pénible OU besoin statut auto dans le CRM | Essential *ou* Business | API Plus (~1 250 €) | 1 838 – 2 438 € |
| **Scale banque** | >250 virements sortants/mois OU support prioritaire | **Business** (1 188 €) | API | ~2 438 € |

**Seuils de bascule (les deux sont INDÉPENDANTS) :**
- **Qonto Essential→Business** : quand **virements/prélèvements SORTANTS > 250/mois** OU besoin support prioritaire / >9 sous-comptes / dashboard avancé. ⚠️ Le **nombre de clients prélevés ne force PAS** le changement (SDD entrant facturé à l'unité, même 0,25 € sur les deux forfaits).
- **Yousign manuel (Plus app)→API** : déclencheur = **automatisation**, pas volume (Plus app illimité en manuel). Bascule quand la charge d'envoi/suivi manuel devient un vrai coût (~50/mois soutenu = 2-3/jour) OU qu'on veut le statut « signé » automatique (devis signé → mandat/facture). ⚠️ **API Plus = 500 sig/an incluses** ; à 50/mois (600/an) → dépassement +2 €/sig (~+200 €/an) ou plan **API Pro** (1 548 €/an). Donc l'API à 50/mois ≈ 1 250–1 450 €/an vs 276 € en manuel : ne basculer que si l'automatisation vaut ce delta (~1 000 €/an + coût dev).
- **Réserve** : l'intégration Yousign API se fera de toute façon un jour (le manuel la reporte, ne l'annule pas) → si croissance rapide + capacité dev dispo, aller direct à l'API évite de coder le flux deux fois.

### 11.5 Facturation de base : PAS de plafond (point 3 vérifié 2026-07)
La **facturation client de base est incluse dans tous les forfaits, en illimité, sans plafond de volume** : devis/factures/avoirs illimités, envoi + suivi statut temps réel, **relances automatiques**, **conformité PDP 2026**, rapprochement facture↔transaction. → l'add-on **n'est pas nécessaire**.
L'add-on « Factures clients Plus » (35 €/mois) n'ajoute que de l'**automatisation avancée** : factures récurrentes automatisées (gérées côté CRM via subscriptions SDD → inutile), **e-signature devis** (→ Yousign), relances *personnalisées*, personnalisation avancée. ⚠️ Qonto a fait transiter ce module « de gratuit à payant » — confirmer en une phrase la frontière exacte à la souscription (articles support Qonto en 403, info tirée des pages produit + revue tierce).

### 11.6 Vraies limites / points bloquants (par gravité)
1. 🔴 **SDD entrant = prérequis bloquant** : activer l'éligibilité « prélèvements entrants » **+ obtenir l'ICS** (Identifiant Créancier SEPA, n° 13 caractères obligatoire sur tous les mandats). Émis par la **Banque de France** via Qonto : **frais unique 50 € HT / 60 € TTC**, ~2 jours ouvrés. Sans ça, impossible de prélever les abonnés. **Jalon à débloquer en premier.** ⚠️ Ne pas confondre avec l'add-on « Factures clients Plus » (35 €/mois, écarté) — deux choses distinctes.
2. 🟠 **OAuth 2.0 obligatoire pour le module SDD** (le reste = clé API `login:secret`) : flux OAuth + stockage/refresh tokens.
3. 🟠 **Rate limits de l'API Qonto** : à vérifier dans la doc pour l'orchestration CRM à volume.
4. 🟠 **Récurrent SDD natif vs cron** : la doc montrait `schedule_type: one_off` → valider en sandbox (sinon cron mensuel créant une collecte par échéance).
5. 🟢 **Virements/prélèvements SORTANTS inclus** : 250/mois (Essential) / 500/mois (Business), puis 0,15 € — léger surcoût si beaucoup de paiements fournisseurs/salaires, pas un blocage.
6. Nombre exact de clients / vitesse de croissance = variable qui décide phase démarrage vs croissance (§11.4).
7. Prix SDD entrant à **re-confirmer contractuellement** (comparateur = « estimations non contractuelles »).

### 11.7 Éligibilité au prélèvement SEPA entrant (vérifié 2026-07)
**Conditions compte/entreprise** : entreprise pleinement opérationnelle (pas en fermeture) · **2FA activée** · compte **jamais à découvert** · aucune saisie pour dettes · taux de rejet/chargeback **< 20 %**.
**Secteurs EXCLUS** : associations, jeux/paris, services financiers, crypto, **voyage**, **marketplaces**, **biens/services à livraison différée**. + critères internes Qonto (cas par cas).
**ICS** obligatoire (cf. §11.6-1) : Banque de France via Qonto, **50 € HT / 60 € TTC** unique, ~2 j ouvrés.
**Analyse cas Logones (SaaS B2B mensuel aux restaurants)** : a priori **éligible** (récurrent faible risque, ni marketplace ni voyage ; chargeback < 20 % trivial en B2B). **Seul point à confirmer avec Qonto** : la clause « services à **livraison différée** » — un SaaS payé au mois pour un service rendu au mois n'est normalement pas concerné, mais à faire valider à l'activation.

---

## 10. Sources

- Grille Qonto « Offres et tarifs » v. 20/04/2026 (document fourni)
- Stripe : https://stripe.com/pricing · SEPA : https://stripe.com/payments/sepa-direct-debit · Billing : https://stripe.com/billing/pricing
- GoCardless : https://gocardless.com/en-us/pricing
- Qonto — prélèvement SEPA entrant : https://qonto.com/fr/payment-methods/direct-debit + comparateur SEPA (in-app) tarifs 16/03/2026
- Qonto API : https://docs.qonto.com/api-reference/introduction + index `https://docs.qonto.com/llms.txt` (ressource *quotes* sans endpoint de signature — vérifié 2026-07)
- Yousign — API : https://yousign.com/pricing-api · application : https://yousign.com/pricing-application
- Qonto — ICS : https://qonto.com/fr/blog/methodes-de-paiement/prelevement/identifiant-creancier-sepa (50 € HT / 60 € TTC, Banque de France, ~2 j)
- Qonto — éligibilité prélèvement entrant : https://qonto.com/fr/payment-methods/direct-debit + support « How to become eligible and activate SDD Collection » (art. 24850425156625)

> Les tarifs évoluent : reconfirmer les prix unitaires (surtout le SDD entrant Qonto) avant décision finale.
