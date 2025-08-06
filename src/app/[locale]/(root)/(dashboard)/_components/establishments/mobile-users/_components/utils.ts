// Fonctions utilitaires pour les composants mobile users

// Fonction utilitaire pour obtenir la valeur initiale d'un champ
export function getInitialValue(value: string | null | undefined, defaultValue: string): string {
  return value ?? defaultValue;
}

// Fonction utilitaire pour obtenir la valeur booléenne initiale
export function getInitialBooleanValue(value: boolean | null | undefined, defaultValue: boolean): boolean {
  return value ?? defaultValue;
}

// Fonction utilitaire pour obtenir le titre du modal
export function getDialogTitle(isEdit: boolean): string {
  return isEdit ? "Modifier l'utilisateur" : "Créer un utilisateur";
}

// Fonction utilitaire pour obtenir le texte du bouton
export function getButtonText(isLoading: boolean, isEdit: boolean): string {
  if (isLoading) return "Enregistrement...";
  if (isEdit) return "Modifier";
  return "Créer";
}
