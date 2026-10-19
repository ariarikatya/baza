export function canManageContent(userOrRole?: any, isAdminFlag?: boolean): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;

  if (typeof userOrRole === 'object') {
    const role = userOrRole['Роль'] || userOrRole['userRole'];
    const isAdmin = userOrRole['Админ?'] === true || userOrRole['isAdmin'] === true;
    const hasRole = Boolean(role && String(role).trim() !== '');
    return hasRole || isAdmin;
  }

  const roleStr = String(userOrRole || '').trim();
  return Boolean(roleStr) || isAdminFlag === true;
}

export function isClubAdmin(userOrRole?: any, isAdminFlag?: boolean): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;

  if (typeof userOrRole === 'object') {
    const role = String(userOrRole['Роль'] || userOrRole['userRole'] || '').trim();
    const isAdmin = userOrRole['Админ?'] === true || userOrRole['isAdmin'] === true;
    return role === 'Админ' || role === 'Владелец' || isAdmin;
  }

  const roleStr = String(userOrRole || '').trim();
  return roleStr === 'Админ' || roleStr === 'Владелец' || isAdminFlag === true;
}

export function isOwner(userOrRole?: any): boolean {
  if (userOrRole === null || userOrRole === undefined) return false;
  if (typeof userOrRole === 'object') {
    const role = String(userOrRole['Роль'] || userOrRole['userRole'] || '').trim();
    return role === 'Владелец';
  }
  return String(userOrRole || '').trim() === 'Владелец';
}
