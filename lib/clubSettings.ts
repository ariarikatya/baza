export const DEFAULT_CLUB_LOGO = '/icons/logo.png';

let cachedLogoUrl: string | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL

export function formatLogoUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let cleanUrl = rawUrl.trim();

  // Support markdown links: [text](url)
  const mdMatch = cleanUrl.match(/\[.*?\]\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) {
    cleanUrl = mdMatch[1];
  } else {
    const httpMatch = cleanUrl.match(/(https?:\/\/[^\s"'<>]+)/);
    if (httpMatch) {
      cleanUrl = httpMatch[1];
    }
  }

  if (!cleanUrl.startsWith('http')) return '';

  // Transform Google Drive links to direct view URLs
  if (cleanUrl.includes('drive.google.com')) {
    const fileIdMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }

  return cleanUrl;
}

export async function getClubLogoUrl(): Promise<string> {
  const now = Date.now();
  if (cachedLogoUrl && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedLogoUrl;
  }

  try {
    const { readSheetRawDisplayValues } = await import('@/lib/googleSheets');
    const rawRows = await readSheetRawDisplayValues('КЛУБ', 'B1:B1000');

    if (rawRows && rawRows.length > 0) {
      for (let i = 0; i < rawRows.length; i++) {
        const rawCell = String(rawRows[i][0] || '').trim();
        if (rawCell && !rawCell.toLowerCase().includes('логотип')) {
          const cleanUrl = formatLogoUrl(rawCell);
          if (cleanUrl) {
            cachedLogoUrl = cleanUrl;
            lastFetchTime = now;
            return cleanUrl;
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ [getClubLogoUrl] Ошибка при чтении столбца B листа "КЛУБ":', err);
  }

  console.warn('логотип не найден в КЛУБ B:B');
  return '';
}

export function invalidateClubLogoCache() {
  cachedLogoUrl = null;
  lastFetchTime = 0;
}
