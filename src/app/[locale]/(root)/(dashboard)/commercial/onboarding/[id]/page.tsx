import { ChecklistDetail } from "./_components/checklist-detail";

export default async function ChecklistPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <ChecklistDetail id={id} locale={locale} />
    </div>
  );
}
