export function getButtonText(isLoading: boolean, isEdit: boolean): string {
  if (isLoading) {
    return isEdit ? "Mise à jour..." : "Création...";
  }
  return isEdit ? "Mettre à jour" : "Créer";
}
