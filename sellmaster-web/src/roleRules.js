export const ROLE_PRIORITY = ['owner', 'manager', 'closer', 'courier'];

export function normalizeRoles(roles) {
  const list = Array.isArray(roles) ? roles : typeof roles === 'string' ? [roles] : [];

  return [...new Set(
    list
      .flatMap((role) => (Array.isArray(role) ? role : [role]))
      .map((value) => {
        if (value && typeof value === 'object' && value.name) {
          return String(value.name).trim().toLowerCase();
        }
        return String(value ?? '').trim().toLowerCase();
      })
      .filter(Boolean)
  )];
}

export function getPrimaryRole(roles, fallback = 'owner') {
  const normalized = normalizeRoles(roles);
  if (!normalized.length) {
    return String(fallback || 'owner').trim().toLowerCase() || 'owner';
  }
  return normalized.find((role) => ROLE_PRIORITY.includes(role)) || normalized[0];
}

export function hasAnyRole(roles, ...allowedRoles) {
  const allowed = allowedRoles.map((role) => String(role).trim().toLowerCase());
  return normalizeRoles(roles).some((role) => allowed.includes(role));
}

export function canManageProducts(roles) {
  return hasAnyRole(roles, 'owner', 'manager', 'closer');
}

export function canEditProducts(roles) {
  return hasAnyRole(roles, 'owner', 'manager');
}

export function canInviteTeamMembers(roles) {
  return hasAnyRole(roles, 'owner');
}

export function canEditTeamCommissions(roles) {
  return hasAnyRole(roles, 'owner', 'manager');
}

export function isTeamMemberRole(roles) {
  return !hasAnyRole(roles, 'owner', 'manager');
}

export function getAllowedOrderStatuses(roles) {
  if (hasAnyRole(roles, 'courier')) return ['livree'];
  if (hasAnyRole(roles, 'owner', 'manager', 'closer')) {
    return ['dashboard', 'livree', 'annulee', 'reportee'];
  }
  return [];
}

export function getAvailablePages(roles) {
  const normalized = normalizeRoles(roles);

  if (hasAnyRole(normalized, 'owner', 'manager')) {
    return ['overview', 'orders', 'products', 'shopify', 'team'];
  }

  if (hasAnyRole(normalized, 'closer')) {
    return ['overview', 'orders', 'products', 'team'];
  }

  if (hasAnyRole(normalized, 'courier')) {
    return ['overview', 'orders', 'team'];
  }

  return ['overview', 'orders', 'team'];
}

function sameUserId(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) return false;
  const leftId = String(left).trim();
  const rightId = String(right).trim();
  return leftId !== '' && rightId !== '' && leftId === rightId;
}

export function filterOrdersForRole(orders, userRoles, currentUserId) {
  const list = Array.isArray(orders) ? orders : [];

  if (hasAnyRole(userRoles, 'owner', 'manager')) return list;

  if (hasAnyRole(userRoles, 'closer')) {
    return list.filter((order) =>
      ['dashboard', 'reportee'].includes(String(order?.status || '').toLowerCase())
      && (order?.assigned_to === null || order?.assigned_to === undefined || order?.assigned_to === ''
        || sameUserId(order?.assigned_to, currentUserId))
    );
  }

  if (hasAnyRole(userRoles, 'courier')) {
    return list.filter((order) =>
      ['dashboard', 'reportee', 'livree'].includes(String(order?.status || '').toLowerCase())
      && sameUserId(order?.assigned_to, currentUserId)
    );
  }

  return list;
}

export function sortOrdersNewestFirst(orders) {
  return (Array.isArray(orders) ? orders : [])
    .map((order, index) => ({ order, index, timestamp: Date.parse(order?.created_at || order?.createdAt || '') }))
    .sort((left, right) => {
      const leftTimestamp = Number.isFinite(left.timestamp) ? left.timestamp : Number.NEGATIVE_INFINITY;
      const rightTimestamp = Number.isFinite(right.timestamp) ? right.timestamp : Number.NEGATIVE_INFINITY;
      return rightTimestamp - leftTimestamp || left.index - right.index;
    })
    .map(({ order }) => order);
}
