const TYPE_PRIORITY = {
  VENDOR_DEPARTMENT_AMOUNT: 7,
  VENDOR_DEPARTMENT: 6,
  DEPARTMENT_AMOUNT: 5,
  VENDOR_AMOUNT: 4,
  DEPARTMENT: 3,
  VENDOR: 2,
  AMOUNT: 1,
  GENERIC: 0,
};

const ruleMatchesInvoice = (rule, input) => {
  const vendorIds = Array.isArray(rule.vendorIds) ? rule.vendorIds : [];
  const departmentIds = Array.isArray(rule.departmentIds) ? rule.departmentIds : [];

  const vendorMatch = vendorIds.length === 0 || vendorIds.includes(String(input.vendorId));
  const deptMatch = departmentIds.length === 0 || departmentIds.includes(String(input.departmentId));
  const minMatch = rule.minAmount === null || rule.minAmount === undefined || input.amount >= Number(rule.minAmount);
  const maxMatch = rule.maxAmount === null || rule.maxAmount === undefined || input.amount <= Number(rule.maxAmount);

  return vendorMatch && deptMatch && minMatch && maxMatch;
};

export const sortRulesBySpecificity = (rules = []) => {
  return [...rules].sort((left, right) => {
    const priorityDiff = TYPE_PRIORITY[right.type] - TYPE_PRIORITY[left.type];
    if (priorityDiff !== 0) return priorityDiff;
    const leftId = Number(left.id || Number.MAX_SAFE_INTEGER);
    const rightId = Number(right.id || Number.MAX_SAFE_INTEGER);
    return leftId - rightId;
  });
};

export const matchWorkflowRule = (rules = [], input) => {
  const activeRules = rules.filter((rule) => rule.isActive);
  const sortedRules = sortRulesBySpecificity(activeRules);
  const matchedRule = sortedRules.find((rule) => ruleMatchesInvoice(rule, input));

  if (!matchedRule) {
    return {
      matched: false,
      reason: 'No matching rule found. Invoice flagged for manual review.',
    };
  }

  return {
    matched: true,
    rule: matchedRule,
    reason: `Matched rule "${matchedRule.name}" (type: ${matchedRule.type})`,
  };
};

export const groupRulesByType = (rules = []) => {
  return {
    VENDOR_DEPARTMENT_AMOUNT: rules.filter((rule) => rule.type === 'VENDOR_DEPARTMENT_AMOUNT'),
    VENDOR_DEPARTMENT: rules.filter((rule) => rule.type === 'VENDOR_DEPARTMENT'),
    DEPARTMENT_AMOUNT: rules.filter((rule) => rule.type === 'DEPARTMENT_AMOUNT'),
    VENDOR_AMOUNT: rules.filter((rule) => rule.type === 'VENDOR_AMOUNT'),
    DEPARTMENT: rules.filter((rule) => rule.type === 'DEPARTMENT'),
    VENDOR: rules.filter((rule) => rule.type === 'VENDOR'),
    AMOUNT: rules.filter((rule) => rule.type === 'AMOUNT'),
    GENERIC: rules.filter((rule) => rule.type === 'GENERIC'),
  };
};

export const hasCatchAllRule = (rules = []) => {
  return rules.some((rule) => rule.type === 'GENERIC' && rule.isActive);
};

export const formatCurrency = (amount = 0) => {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
};

export const getConditionSummary = (rule) => {
  const parts = [];
  const vendorNames = Array.isArray(rule.vendorNames) ? rule.vendorNames : [];
  const departmentNames = Array.isArray(rule.departmentNames) ? rule.departmentNames : [];

  if (vendorNames.length > 0) parts.push(vendorNames.join(', '));
  if (departmentNames.length > 0) parts.push(departmentNames.join(', '));
  if (rule.minAmount !== null && rule.minAmount !== undefined) parts.push(`≥ ${formatCurrency(rule.minAmount)}`);
  if (rule.maxAmount !== null && rule.maxAmount !== undefined) parts.push(`≤ ${formatCurrency(rule.maxAmount)}`);

  return parts.join(' · ') || 'All invoices';
};
