import { UserProfileCard } from "@/components/user/user-profile-card";

export default function MetadataTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">Test des Métadonnées Utilisateur</h1>
          <p className="text-muted-foreground">
            Cette page affiche toutes les métadonnées de votre utilisateur, incluant les permissions, features,
            préférences et profil.
          </p>
        </div>

        <UserProfileCard />
      </div>
    </div>
  );
}
