import { normalizeName } from '@/lib/calculations';

/**
 * Checks if a raw value represents a truthy boolean/flag for role or admin status.
 */
export function isRoleTrueFlag(raw: any): boolean {
  if (raw === true) return true;
  if (raw === false || raw === null || raw === undefined) return false;

  const str = String(raw).trim().toLowerCase();
  const normalized = normalizeName(str);

  const truthyValues = ['true', '1', 'истина', 'да', 'yes', 'y', '✓', '✔'];
  return truthyValues.includes(str) || truthyValues.includes(normalized);
}

/**
 * Returns the human-readable display name for a player's role.
 * If Role is boolean TRUE / 'TRUE' -> 'Администратор'
 * If Role is 'Владелец' -> 'Владелец'
 * If Role is a non-empty string (e.g. 'Админ', 'Администратор') -> 'Администратор' or actual string
 * If Role is empty but 'Админ?' is true -> 'Администратор'
 * Otherwise -> 'Игрок'
 */
export function getRoleDisplayName(playerOrRole: any): string {
  if (playerOrRole === null || playerOrRole === undefined) return 'Игрок';

  let rawRole: any = playerOrRole;
  let isAdminFlag = false;

  if (typeof playerOrRole === 'object') {
    rawRole = playerOrRole['Роль'] ?? playerOrRole['userRole'] ?? playerOrRole['role'];
    isAdminFlag = isRoleTrueFlag(playerOrRole['Админ?'] ?? playerOrRole['isAdmin']);
  }

  if (isRoleTrueFlag(rawRole)) {
    return 'Администратор';
  }

  const roleStr = String(rawRole || '').trim();
  const normRole = normalizeName(roleStr);

  if (roleStr === '' || normRole === 'false') {
    if (isAdminFlag) return 'Администратор';
    return 'Игрок';
  }

  if (normRole === 'владелец') {
    return 'Владелец';
  }

  if (['админ', 'администратор', 'admin', 'administrator'].includes(normRole)) {
    return 'Администратор';
  }

  return roleStr;
}
