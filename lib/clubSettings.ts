export const DEFAULT_CLUB_LOGO =
  'https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/ZPgCVS1NXRl1OOmbr16K/pub/P501EvW31guuymrmZYZM.jpg';

let cachedLogoUrl: string | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export async function getClubLogoUrl(): Promise<string> {
  const now = Date.now();
  if (cachedLogoUrl && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedLogoUrl;
  }

  try {
    const { readSheet } = await import('@/lib/googleSheets');
    const rows = await readSheet('КЛУБ');
    if (rows && rows.length > 0 && rows[0]['Логотип']) {
      const url = String(rows[0]['Логотип']).trim();
      if (url && url.startsWith('http')) {
        cachedLogoUrl = url;
        lastFetchTime = now;
        return url;
      }
    }
  } catch (err) {
    console.error('Error fetching club logo from sheets:', err);
  }

  return cachedLogoUrl || DEFAULT_CLUB_LOGO;
}

export function invalidateClubLogoCache() {
  cachedLogoUrl = null;
  lastFetchTime = 0;
}
