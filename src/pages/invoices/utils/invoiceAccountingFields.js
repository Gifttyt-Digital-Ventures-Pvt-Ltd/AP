export const VOUCHER_TYPE_OPTIONS = [
  "Purchase",
  "Payment",
  "Journal",
  "Debit Note",
  "Credit Note",
  "Receipt",
  "Contra",
  "Stock Journal",
];

export const EXPENSE_TYPE_OPTIONS = ["Direct Expense", "Indirect Expense"];

export const normalizeVoucherTypeOptions = (response) => {
  const source =
    response?.items ??
    response?.voucherTypes ??
    response?.voucher_types ??
    response?.data ??
    response;
  const items = Array.isArray(source) ? source : [];

  return items
    .map((item) => {
      if (typeof item === "string") return item;
      return item?.name ?? item?.label ?? item?.value ?? item?.voucherType ?? item?.voucher_type;
    })
    .map((value) => String(value || "").trim())
    .filter(Boolean);
};

const EXPENSE_TYPE_KEYWORDS = [
  "DIRECT EXPENSE",
  "DIRECT EXPENSES",
  "INDIRECT EXPENSE",
  "INDIRECT EXPENSES",
];

export const normalizeExpenseType = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  const upper = normalized.toUpperCase();
  if (upper.includes("INDIRECT") && upper.includes("EXPENSE")) return "Indirect Expense";
  if (upper.includes("DIRECT") && upper.includes("EXPENSE")) return "Direct Expense";
  return normalized;
};

export const deriveExpenseTypeFromAccountingNode = (node = {}) => {
  const candidates = [
    node.expenseType,
    node.expense_type,
    node.category,
    node.group,
    node.parentGroup,
    node.ledgerType,
    node.accountType,
    node.name,
  ];

  const match = candidates.find((value) => {
    const upper = String(value || "").toUpperCase();
    return EXPENSE_TYPE_KEYWORDS.some((keyword) => upper.includes(keyword));
  });

  return normalizeExpenseType(match);
};

export const deriveExpenseTypeFromLedger = deriveExpenseTypeFromAccountingNode;

export const buildGroupBranchOptionsFromCoa = (tree = []) => {
  const options = [];

  const walk = (nodes = [], category = "") => {
    nodes.forEach((node) => {
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const nodeType = String(node.type || "").toLowerCase();
      const isGroupOrBranch =
        hasChildren &&
        (nodeType.includes("group") ||
          nodeType.includes("category") ||
          nodeType.includes("header") ||
          nodeType === "");

      if (isGroupOrBranch) {
        const id = String(node.id || node.erpId || node.name || "").trim();
        const name = String(node.name || node.accountName || id || "").trim();
        if (id && name) {
          const effectiveCategory = category || name;
          const expenseType = deriveExpenseTypeFromAccountingNode({
            ...node,
            category: effectiveCategory,
          });
          options.push({
            value: id,
            label: category && category !== name ? `${category} - ${name}` : name,
            accountGroupId: id,
            accountGroupName: name,
            groupId: id,
            groupName: name,
            category,
            expenseType,
            raw: node,
          });
        }
      }

      walk(node.children || [], nodeType.includes("category") ? node.name : category);
    });
  };

  walk(tree);
  return options;
};

export const buildLedgerOptionsFromCoa = (ledgers = [], fallbackOptions = []) => {
  const optionsById = new Map();

  ledgers.forEach((ledger) => {
    const id = String(ledger.id || ledger.erpId || ledger.name || "").trim();
    const name = String(ledger.name || ledger.accountName || id || "").trim();
    if (!id || !name) return;

    const expenseType = deriveExpenseTypeFromLedger(ledger);
    const code = ledger.code ? ` (${ledger.code})` : "";
    const group = ledger.group && ledger.group !== "—" ? ` - ${ledger.group}` : "";

    optionsById.set(id, {
      value: id,
      label: `${name}${code}${group}`,
      ledgerId: id,
      ledgerName: name,
      expenseType,
      raw: ledger,
    });
  });

  fallbackOptions.forEach((option) => {
    const value = typeof option === "string" ? option : option?.value;
    const label = typeof option === "string" ? option : option?.label;
    const key = String(value || label || "").trim();
    if (!key || optionsById.has(key)) return;
    optionsById.set(key, {
      value: key,
      label: label || key,
      ledgerId: key,
      ledgerName: label || key,
      expenseType: normalizeExpenseType(option?.expenseType),
      raw: option,
    });
  });

  return Array.from(optionsById.values());
};

export const findAccountingOption = (options = [], value = "") => {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return null;
  return (
    options.find(
      (option) =>
        String(option.value || "") === normalizedValue ||
        String(option.ledgerId || "") === normalizedValue ||
        String(option.ledgerName || "") === normalizedValue ||
        String(option.accountGroupId || "") === normalizedValue ||
        String(option.accountGroupName || "") === normalizedValue ||
        String(option.groupId || "") === normalizedValue ||
        String(option.groupName || "") === normalizedValue ||
        String(option.label || "") === normalizedValue,
    ) || null
  );
};

export const findLedgerOption = findAccountingOption;
