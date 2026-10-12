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

export function getAvailablePages(roles) {
  const normalized = normalizeRoles(roles);

  if (hasAnyRole(normalized, 'owner', 'manager')) {
    return ['overview', 'orders', 'products', 'shopify', 'team'];
  }

  if (hasAnyRole(normalized, 'closer')) {
    return ['overview', 'orders', 'team'];
  }

  if (hasAnyRole(normalized, 'courier')) {
    return ['overview', 'orders', 'team'];
  }

  return ['overview', 'orders', 'team'];
}
