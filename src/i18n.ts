import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

const locales = ["fr", "en", "es"];

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    locale: locale as string,
    messages: (await import(`./locales/${locale}.json`)).default,
  };
}); 