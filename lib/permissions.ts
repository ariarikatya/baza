export function canManageContent(userOrRole?: any, isAdminFlag?: boolean): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;

  if (typeof userOrRole === 'object') {
    const role = userOrRole['Роль'] || userOrRole['userRole'];
    const isAdmin = userOrRole['Админ?'] === true || String(userOrRole['Админ?']).toLowerCase() === 'true' || userOrRole['isAdmin'] === true;
    const roleStr = String(role || '').trim();
    const hasRole = Boolean(roleStr && roleStr.toLowerCase() !== 'false');
    return hasRole || isAdmin;
  }

  const roleStr = String(userOrRole || '').trim();
  return Boolean(roleStr && roleStr.toLowerCase() !== 'false') || isAdminFlag === true;
}

export function isClubAdmin(userOrRole?: any, isAdminFlag?: boolean): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;

  if (typeof userOrRole === 'object') {
    const role = String(userOrRole['Роль'] || userOrRole['userRole'] || '').trim().toLowerCase();
    const isAdmin = userOrRole['Админ?'] === true || String(userOrRole['Админ?']).toLowerCase() === 'true' || userOrRole['isAdmin'] === true;
    const isRoleAdmin = ['администратор', 'админ', 'владелец', 'true', '1'].includes(role) || userOrRole['Роль'] === true;
    return isRoleAdmin || isAdmin;
  }

  const roleStr = String(userOrRole || '').trim().toLowerCase();
  return ['администратор', 'админ', 'владелец', 'true', '1'].includes(roleStr) || isAdminFlag === true;
}

export function isOwner(userOrRole?: any): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;
  if (typeof userOrRole === 'object') {
    const role = String(userOrRole['Роль'] || userOrRole['userRole'] || '').trim();
    return role === 'Владелец';
  }
  return String(userOrRole || '').trim() === 'Владелец';
}
