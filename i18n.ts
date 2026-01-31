import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Can be imported from a shared config
const locales = ['en', 'es'];

export default getRequestConfig(async ({ locale }) => {
  const currentLocale = locale || 'en';
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(currentLocale as any)) notFound();

  return {
    locale: currentLocale,
    messages: (await import(`./messages/${currentLocale}.json`)).default
  };
});
