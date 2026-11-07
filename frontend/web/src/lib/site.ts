/**
 * Public site constants used for SEO (metadata, sitemap, robots, structured data).
 *
 * SITE_URL: set NEXT_PUBLIC_SITE_URL (e.g. https://acsaura.in) once a custom domain exists.
 * On Vercel, VERCEL_PROJECT_PRODUCTION_URL is provided automatically and is used otherwise.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;
  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = 'Dr. ACS-AURA 2026';
export const MEET_NAME = 'VTU’s 28th Inter-Collegiate State Level Athletic Meet 2026';
export const SITE_TITLE = `${SITE_NAME} — ${MEET_NAME}`;
export const SITE_DESCRIPTION =
  'Dr. ACS-AURA 2026 — VTU’s 28th Inter-Collegiate State Level Athletic Meet, 7–10 December 2026 at Dr. ACS College of Engineering, Bengaluru. College student registration, list of events, time table, rules and venue details.';
export const BRAND_COLOR = '#800000';
