import { PreInvoiceDetail } from "./_components/pre-invoice-detail";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function PreFacturationDetailPage({ params }: Props) {
  const { locale, id } = await params;
  return <PreInvoiceDetail id={id} locale={locale} />;
}
