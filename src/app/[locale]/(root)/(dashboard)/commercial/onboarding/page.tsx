import { OnboardingContent } from "./_components/onboarding-content";

export default function OnboardingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Onboarding</h1>
        <p className="text-muted-foreground text-sm">Suivez la progression d&apos;intégration de chaque client</p>
      </div>
      <OnboardingContent />
    </div>
  );
}
