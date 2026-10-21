import { isRoleTrueFlag } from '@/lib/roleDisplay';

export function canManageContent(userOrRole?: any, isAdminFlag?: boolean): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;

  if (typeof userOrRole === 'object') {
    const role = userOrRole['Роль'] ?? userOrRole['userRole'];
    const isAdmin = isRoleTrueFlag(userOrRole['Админ?'] ?? userOrRole['isAdmin']);
    const isRoleTrue = isRoleTrueFlag(role);
    const roleStr = String(role || '').trim();
    const hasRole = Boolean(roleStr && roleStr.toLowerCase() !== 'false');
    return hasRole || isRoleTrue || isAdmin;
  }

  const roleStr = String(userOrRole || '').trim();
  return Boolean(roleStr && roleStr.toLowerCase() !== 'false') || isRoleTrueFlag(userOrRole) || isAdminFlag === true;
}

export function isClubAdmin(userOrRole?: any, isAdminFlag?: boolean): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;

  if (typeof userOrRole === 'object') {
    const rawRole = userOrRole['Роль'] ?? userOrRole['userRole'];
    const role = String(rawRole || '').trim().toLowerCase();
    const isAdmin = isRoleTrueFlag(userOrRole['Админ?'] ?? userOrRole['isAdmin']);
    const isRoleAdmin = isRoleTrueFlag(rawRole) || ['администратор', 'админ', 'владелец', 'true', '1', 'истина'].includes(role);
    return isRoleAdmin || isAdmin;
  }

  const roleStr = String(userOrRole || '').trim().toLowerCase();
  return isRoleTrueFlag(userOrRole) || ['администратор', 'админ', 'владелец', 'true', '1', 'истина'].includes(roleStr) || isAdminFlag === true;
}

export function isOwner(userOrRole?: any): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;
  if (typeof userOrRole === 'object') {
    const role = String(userOrRole['Роль'] || userOrRole['userRole'] || '').trim();
    return role === 'Владелец';
  }
  return String(userOrRole || '').trim() === 'Владелец';
}
