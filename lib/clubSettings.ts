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
    const { readSheetRawDisplayValues } = await import('@/lib/googleSheets');
    const rawRows = await readSheetRawDisplayValues('КЛУБ');

    if (rawRows && rawRows.length >= 2) {
      // Column B is index 1 (A=0, B=1)
      for (let i = 1; i < rawRows.length; i++) {
        const rawCell = String(rawRows[i][1] || '').trim();
        if (rawCell) {
          let cleanUrl = rawCell;
          const mdMatch = rawCell.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/);
          if (mdMatch) {
            cleanUrl = mdMatch[1];
          } else {
            const httpMatch = rawCell.match(/(https?:\/\/[^\s"'<>]+)/);
            if (httpMatch) {
              cleanUrl = httpMatch[1];
            }
          }

          if (cleanUrl && cleanUrl.startsWith('http')) {
            cachedLogoUrl = cleanUrl;
            lastFetchTime = now;
            return cleanUrl;
          }
        }
      }
    }
    console.error('❌ [getClubLogoUrl] Столбец B листа "КЛУБ" пуст или не содержит валидную URL-ссылку на логотип.');
  } catch (err) {
    console.error('❌ [getClubLogoUrl] Ошибка при чтении столбца B листа "КЛУБ":', err);
  }

  return cachedLogoUrl || DEFAULT_CLUB_LOGO;
}

export function invalidateClubLogoCache() {
  cachedLogoUrl = null;
  lastFetchTime = 0;
}
