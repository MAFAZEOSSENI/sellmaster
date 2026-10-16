const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  owner: ['dashboard', 'livree', 'annulee', 'reportee'],
  manager: ['dashboard', 'livree', 'annulee', 'reportee'],
  closer: ['dashboard', 'livree', 'annulee', 'reportee'],
  courier: ['livree'],
});

function canTransitionOrderStatus(role, status) {
  return Boolean(ALLOWED_STATUS_TRANSITIONS[String(role || '').toLowerCase()]?.includes(status));
}

function canViewOrderForRole(order, role, userId) {
  const normalizedRole = String(role || '').toLowerCase();
  const status = String(order?.status || '').toLowerCase();
  if (['owner', 'manager'].includes(normalizedRole)) return true;

  if (normalizedRole === 'closer') {
    return ['dashboard', 'reportee'].includes(status)
      && (order?.assigned_to == null || Number(order.assigned_to) === Number(userId));
  }

  if (normalizedRole === 'courier') {
    return ['dashboard', 'reportee', 'livree'].includes(status)
      && Number(order?.assigned_to) === Number(userId);
  }

  return false;
}

module.exports = { ALLOWED_STATUS_TRANSITIONS, canTransitionOrderStatus, canViewOrderForRole };
