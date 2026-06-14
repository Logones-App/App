import { QuoteBuilder } from "./_components/quote-builder";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function DevisDetailPage({ params }: Props) {
  const { locale, id } = await params;
  return <QuoteBuilder id={id} locale={locale} />;
}
