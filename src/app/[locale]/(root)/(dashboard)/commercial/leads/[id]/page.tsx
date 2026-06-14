import { LeadDetail } from "./_components/lead-detail";

interface Props {
  params: Promise<{ id: string; locale: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const { id, locale } = await params;
  return <LeadDetail id={id} locale={locale} />;
}
