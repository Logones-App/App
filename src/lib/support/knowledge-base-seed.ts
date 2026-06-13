export interface KnowledgeEntry {
  title: string;
  content: string;
  category: string;
}

export const knowledgeBaseSeed: KnowledgeEntry[] = [
  // ─── Établissements ───────────────────────────────────────────────────────
  {
    title: "Comment créer un établissement",
    category: "etablissements",
    content: `Pour créer un établissement, rendez-vous dans le dashboard principal et cliquez sur "Nouvel établissement".
Renseignez les informations obligatoires : nom, adresse, téléphone, email.
Vous pouvez également ajouter un logo, une image de couverture et une description.
Une fois créé, l'établissement apparaît dans votre liste et vous pouvez le configurer.`,
  },
  {
    title: "Comment modifier les informations d'un établissement",
    category: "etablissements",
    content: `Dans le dashboard, sélectionnez votre établissement puis allez dans l'onglet "Informations".
Vous pouvez modifier le nom, l'adresse, le téléphone, l'email, le site web et les images.
N'oubliez pas de sauvegarder vos modifications en cliquant sur le bouton "Enregistrer".`,
  },
  {
    title: "Comment rendre un établissement public ou privé",
    category: "etablissements",
    content: `Dans les paramètres de l'établissement, vous trouverez l'option "Établissement public".
Quand cette option est activée, la page de réservation de l'établissement est accessible aux clients.
Quand elle est désactivée, la page n'est plus accessible et les réservations en ligne sont suspendues.`,
  },

  // ─── Réservations ──────────────────────────────────────────────────────────
  {
    title: "Comment confirmer une réservation",
    category: "reservations",
    content: `Dans le dashboard, allez dans la section "Réservations".
Les réservations en attente apparaissent avec le statut "En attente".
Cliquez sur une réservation pour voir les détails, puis cliquez sur "Confirmer" pour l'accepter.
Le client reçoit automatiquement un email de confirmation.`,
  },
  {
    title: "Comment annuler une réservation",
    category: "reservations",
    content: `Dans la liste des réservations, cliquez sur la réservation à annuler.
Cliquez sur "Annuler la réservation" et indiquez la raison si nécessaire.
Le client est notifié par email de l'annulation.
Les réservations annulées restent visibles dans l'historique avec le statut "Annulé".`,
  },
  {
    title: "Comment filtrer et rechercher des réservations",
    category: "reservations",
    content: `Dans la section "Réservations", utilisez les filtres disponibles :
- Par date : sélectionnez une plage de dates
- Par statut : en attente, confirmée, annulée, terminée
- Par recherche : nom du client ou email
Vous pouvez combiner plusieurs filtres pour affiner vos résultats.`,
  },

  // ─── Créneaux ──────────────────────────────────────────────────────────────
  {
    title: "Comment configurer les créneaux de réservation",
    category: "creneaux",
    content: `Dans les paramètres de l'établissement, allez dans "Créneaux de réservation".
Cliquez sur "Nouveau créneau" pour créer un service (ex: Déjeuner, Dîner).
Configurez pour chaque créneau : le nom, les jours de disponibilité, l'heure de début et de fin, la durée des slots et la capacité maximale.
Les créneaux configurés apparaissent automatiquement sur la page de réservation publique.`,
  },
  {
    title: "Comment activer ou désactiver un créneau",
    category: "creneaux",
    content: `Dans la liste des créneaux, chaque créneau dispose d'un interrupteur actif/inactif.
Un créneau inactif n'apparaît plus sur la page de réservation publique.
Les réservations existantes sur ce créneau ne sont pas affectées.`,
  },

  // ─── Exceptions ────────────────────────────────────────────────────────────
  {
    title: "Comment créer une fermeture exceptionnelle",
    category: "exceptions",
    content: `Dans le dashboard, allez dans "Exceptions de réservation".
Cliquez sur "Nouvelle exception" et choisissez le type :
- Période : fermeture sur plusieurs jours consécutifs
- Jour unique : fermeture d'une seule journée
- Service : fermeture d'un service spécifique sur une date
- Créneaux : fermeture de certains créneaux horaires seulement
Indiquez la raison (ex: Vacances, Travaux) et sauvegardez.
Les créneaux concernés ne seront plus disponibles à la réservation.`,
  },
  {
    title: "Comment supprimer une exception de réservation",
    category: "exceptions",
    content: `Dans la liste des exceptions, trouvez l'exception à supprimer.
Cliquez sur l'icône de suppression (corbeille) à droite de l'exception.
Confirmez la suppression. Les créneaux redeviennent immédiatement disponibles.`,
  },

  // ─── Planning ──────────────────────────────────────────────────────────────
  {
    title: "Comment utiliser le planning des employés",
    category: "planning",
    content: `Le module planning vous permet de gérer les horaires de vos employés.
Allez dans "Planning" dans le menu principal.
Vous pouvez visualiser les horaires en vue semaine ou mois.
Pour créer un shift, cliquez sur un créneau vide et renseignez l'employé, le poste, les heures de début et de fin.
Vous pouvez glisser-déposer les shifts pour les déplacer.`,
  },
  {
    title: "Comment créer un shift récurrent dans le planning",
    category: "planning",
    content: `Lors de la création d'un shift, activez l'option "Récurrent".
Choisissez la fréquence : chaque semaine, toutes les 2 semaines, etc.
Sélectionnez les jours de la semaine concernés et la date de fin de récurrence.
Tous les shifts récurrents seront créés automatiquement. Vous pouvez modifier un shift individuel sans affecter les autres.`,
  },
  {
    title: "Comment ajouter un employé",
    category: "planning",
    content: `Dans la section "Employés", cliquez sur "Nouvel employé".
Renseignez le prénom, nom, email et poste.
L'employé apparaît ensuite dans le sélecteur lors de la création de shifts dans le planning.`,
  },

  // ─── Menus & Produits ──────────────────────────────────────────────────────
  {
    title: "Comment créer un menu",
    category: "menus",
    content: `Dans le dashboard, allez dans "Menus" puis cliquez sur "Nouveau menu".
Donnez un nom au menu (ex: Menu du midi, Carte des vins).
Vous pouvez y ajouter des catégories et des produits.
Un menu peut être actif ou inactif selon la saison ou l'heure.`,
  },
  {
    title: "Comment ajouter un produit",
    category: "menus",
    content: `Dans la section "Produits", cliquez sur "Nouveau produit".
Renseignez le nom, la description, le prix de vente et la catégorie.
Vous pouvez également ajouter une photo et configurer les modificateurs (options, suppléments).
Le produit peut ensuite être ajouté à un ou plusieurs menus.`,
  },

  // ─── Organisation & Membres ────────────────────────────────────────────────
  {
    title: "Comment inviter un membre à l'organisation",
    category: "organisation",
    content: `Dans les paramètres de l'organisation, allez dans "Membres".
Cliquez sur "Inviter un membre" et entrez l'adresse email de la personne.
Elle recevra un email d'invitation avec un lien pour rejoindre l'organisation.
Vous pouvez lui attribuer un rôle (administrateur, manager, etc.).`,
  },
  {
    title: "Comment changer le rôle d'un membre",
    category: "organisation",
    content: `Dans "Membres" de l'organisation, cliquez sur le membre concerné.
Sélectionnez le nouveau rôle dans la liste déroulante.
Les modifications de rôle sont effectives immédiatement.`,
  },

  // ─── Compte & Connexion ────────────────────────────────────────────────────
  {
    title: "Comment réinitialiser mon mot de passe",
    category: "compte",
    content: `Sur la page de connexion, cliquez sur "Mot de passe oublié ?".
Entrez votre adresse email et cliquez sur "Envoyer".
Vous recevrez un email avec un lien de réinitialisation valable 1 heure.
Cliquez sur le lien et choisissez un nouveau mot de passe.`,
  },
  {
    title: "Je ne reçois pas les emails de l'application",
    category: "compte",
    content: `Vérifiez d'abord votre dossier spam/courrier indésirable.
Assurez-vous que l'adresse email utilisée est correcte dans votre profil.
Si vous utilisez un filtre anti-spam, ajoutez noreply@la-plank-des-gones.fr à vos expéditeurs de confiance.
Si le problème persiste, contactez le support.`,
  },
];
