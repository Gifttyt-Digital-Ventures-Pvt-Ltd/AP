import { formatCurrency as formatCurrencyAmount } from "../../../utils/currency";

const TYPE_PRIORITY = {
  VENDOR_DEPARTMENT_AMOUNT_CATEGORY: 15,
  VENDOR_DEPARTMENT_CATEGORY: 14,
  VENDOR_DEPARTMENT_AMOUNT: 13,
  DEPARTMENT_AMOUNT_CATEGORY: 12,
  VENDOR_AMOUNT_CATEGORY: 11,
  VENDOR_CATEGORY: 10,
  DEPARTMENT_CATEGORY: 9,
  AMOUNT_CATEGORY: 8,
  VENDOR_DEPARTMENT: 7,
  DEPARTMENT_AMOUNT: 6,
  VENDOR_AMOUNT: 5,
  CATEGORY: 4,
  DEPARTMENT: 3,
  VENDOR: 2,
  AMOUNT: 1,
  GENERIC: 0,
};

const ruleMatchesInvoice = (rule, input) => {
  const vendorIds = Array.isArray(rule.vendorIds) ? rule.vendorIds : [];
  const departmentIds = Array.isArray(rule.departmentIds) ? rule.departmentIds : [];
  const categoryIds = Array.isArray(rule.categoryIds) ? rule.categoryIds : [];

  const vendorMatch = vendorIds.length === 0 || vendorIds.includes(String(input.vendorId));
  const deptMatch = departmentIds.length === 0 || departmentIds.includes(String(input.departmentId));
  const categoryMatch = categoryIds.length === 0 || categoryIds.includes(String(input.categoryId));
  const minMatch = rule.minAmount === null || rule.minAmount === undefined || input.amount >= Number(rule.minAmount);
  const maxMatch = rule.maxAmount === null || rule.maxAmount === undefined || input.amount <= Number(rule.maxAmount);

  return vendorMatch && deptMatch && categoryMatch && minMatch && maxMatch;
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
  return rules.reduce((acc, rule) => {
    const type = String(rule?.type || '').trim();
    if (!type) return acc;
    if (!acc[type]) acc[type] = [];
    acc[type].push(rule);
    return acc;
  }, {});
};

export const hasCatchAllRule = (rules = []) => {
  return rules.some((rule) => rule.type === 'GENERIC' && rule.isActive);
};

export { formatCurrencyAmount as formatCurrency };

export const getConditionSummary = (rule) => {
  const parts = [];
  const vendorNames = Array.isArray(rule.vendorNames) ? rule.vendorNames : [];
  const departmentNames = Array.isArray(rule.departmentNames) ? rule.departmentNames : [];
  const categoryNames = Array.isArray(rule.categoryNames) ? rule.categoryNames : [];
  const ruleCurrency = rule.currency || 'INR';

  if (vendorNames.length > 0) parts.push(vendorNames.join(', '));
  if (departmentNames.length > 0) parts.push(departmentNames.join(', '));
  if (categoryNames.length > 0) parts.push(categoryNames.join(', '));
  if (rule.minAmount !== null && rule.minAmount !== undefined) {
    parts.push(`≥ ${formatCurrencyAmount(rule.minAmount, ruleCurrency)}`);
  }
  if (rule.maxAmount !== null && rule.maxAmount !== undefined) {
    parts.push(`≤ ${formatCurrencyAmount(rule.maxAmount, ruleCurrency)}`);
  }

  return parts.join(' · ') || 'All invoices';
};
