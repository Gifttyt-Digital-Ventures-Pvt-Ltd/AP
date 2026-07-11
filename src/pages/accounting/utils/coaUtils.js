import {
  ACC_STATUS,
  ACCOUNT_STATUS,
  COA_TYPE,
  ERP_SOURCE_LABELS,
  ERP_STATUS,
  OBJECT_TYPE,
  OBJECT_TYPE_TO_TAB,
  QUEUE_TAB,
  SYNC_STATUS,
} from "../constants";

export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/** Compact INR like the PRD UI (₹1.8Cr / ₹4.2L). */
export const formatCurrencyCompact = (value) => {
  const n = Number(value || 0);
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const erpSourceLabel = (source) => ERP_SOURCE_LABELS[source] || source || "—";

export const getAccountingErrorMessage = (error, fallback = "Something went wrong") =>
  error?.data?.detail ||
  error?.data?.message ||
  error?.data?.error ||
  error?.error ||
  error?.message ||
  fallback;

const normalizeType = (raw = {}) => {
  const value = String(raw.type || raw.nodeType || raw.node_type || "")
    .toLowerCase()
    .trim();

  if (value === "category" || value.includes("categor")) return COA_TYPE.CATEGORY;
  if (value === "group" || value.includes("group") || value.includes("header")) {
    return COA_TYPE.GROUP;
  }
  // Exact leaf labels only — do NOT match "account" inside "account_type" strings loosely
  if (value === "ledger" || value === "account" || value === "accounts") {
    return COA_TYPE.LEDGER;
  }

  const level = raw.hierarchyLevel ?? raw.hierarchy_level ?? raw.level;
  if (level === 0 || level === "0") return COA_TYPE.CATEGORY;
  if (level === 1 || level === "1") return COA_TYPE.GROUP;
  if (level != null && Number(level) >= 2) return COA_TYPE.LEDGER;

  const childSource = raw.children || raw.childNodes || raw.child_nodes;
  if (Array.isArray(childSource) && childSource.length > 0) {
    return COA_TYPE.GROUP; // refined by retypeTreeByStructure
  }

  return null;
};

/** After nesting, force parents with children to category/group (never leaf-green ledger). */
export const retypeTreeByStructure = (nodes = []) =>
  nodes.map((node) => {
    const children = Array.isArray(node.children) && node.children.length
      ? retypeTreeByStructure(node.children)
      : undefined;

    let type = node.type;
    if (children?.length) {
      const onlyLedgers = children.every((child) => child.type === COA_TYPE.LEDGER && !child.children?.length);
      const hasBranchChildren = children.some(
        (child) =>
          child.type === COA_TYPE.GROUP ||
          child.type === COA_TYPE.CATEGORY ||
          child.children?.length,
      );
      if (hasBranchChildren) type = COA_TYPE.CATEGORY;
      else if (onlyLedgers) type = COA_TYPE.GROUP;
      else type = type && type !== COA_TYPE.LEDGER ? type : COA_TYPE.GROUP;
    } else {
      type = type || COA_TYPE.LEDGER;
    }

    return {
      ...node,
      type,
      children,
      parentGroup:
        node.parentGroup ||
        (type === COA_TYPE.LEDGER ? node.parentGroup : node.parentGroup),
    };
  });

const pickUsage = (raw = {}) => {
  const usage = raw.usage || {};
  return {
    spend: Number(raw.spend ?? usage.spend ?? 0),
    vendors: Number(raw.vendors ?? usage.vendors ?? 0),
    invoices: Number(raw.invoices ?? usage.invoices ?? 0),
    lineItems: Number(raw.lineItems ?? raw.line_items ?? usage.lineItems ?? usage.line_items ?? 0),
  };
};

/** Normalize one node into PRD COANode shape (nested children). */
export const normalizeCoaNode = (raw = {}, parentGroupName = "") => {
  const type = normalizeType(raw);
  const usage = pickUsage(raw);
  const name = raw.name || raw.accountName || raw.account_name || "—";
  const id = String(raw.id || raw.accountId || raw.account_id || name);
  const childSource = raw.children || raw.childNodes || raw.child_nodes || null;

  const node = {
    id,
    name,
    type,
    code: raw.code || raw.accountCode || raw.account_code || undefined,
    ledgerType:
      raw.ledgerType ||
      raw.ledger_type ||
      raw.accountType ||
      raw.account_type ||
      undefined,
    erpId: raw.erpId || raw.erp_id || raw.accountId || raw.account_id || undefined,
    parentId:
      raw.parentId || raw.parent_id || raw.parentAccountId || raw.parent_account_id || undefined,
    parentType: raw.parentType || raw.parent_type || undefined,
    parentGroup: raw.parentGroup || raw.parent_group || parentGroupName || undefined,
    hierarchyLevel: raw.hierarchyLevel ?? raw.hierarchy_level ?? raw.level ?? undefined,
    erpSource: raw.erpSource || raw.erp_source || undefined,
    status: raw.status || ACCOUNT_STATUS.ACTIVE,
    ...usage,
  };

  if (Array.isArray(childSource) && childSource.length > 0) {
    const nextParent =
      type === COA_TYPE.GROUP || type === COA_TYPE.CATEGORY || !type ? name : parentGroupName;
    node.children = childSource.map((child) => normalizeCoaNode(child, nextParent));
  }

  return node;
};

/** Build nested tree from flat parentId list (legacy / alternate API). */
export const nestFlatCoaNodes = (flat = []) => {
  const normalized = flat.map((raw) => {
    const node = normalizeCoaNode(raw);
    return {
      ...node,
      parentId: raw.parentId || raw.parent_id || raw.parentAccountId || raw.parent_account_id || null,
    };
  });

  const byParent = new Map();
  normalized.forEach((node) => {
    const key = node.parentId || "__root__";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(node);
  });

  const walk = (parentId, parentGroupName = "") =>
    (byParent.get(parentId || "__root__") || []).map((node) => {
      const children = walk(node.id, node.name || parentGroupName);
      const next = {
        id: node.id,
        name: node.name,
        type: node.type,
        code: node.code,
        ledgerType: node.ledgerType,
        erpId: node.erpId,
        parentId: node.parentId,
        parentType: node.parentType,
        parentGroup: node.parentGroup || parentGroupName || undefined,
        hierarchyLevel: node.hierarchyLevel,
        erpSource: node.erpSource,
        status: node.status,
        spend: node.spend,
        vendors: node.vendors,
        invoices: node.invoices,
        lineItems: node.lineItems,
      };
      if (children.length) next.children = children;
      return next;
    });

  return retypeTreeByStructure(walk(null));
};

const extractRawNodeList = (payload = {}) => {
  if (Array.isArray(payload.tree)) return { list: payload.tree, nestedHint: true };
  if (Array.isArray(payload.nodes)) return { list: payload.nodes };
  if (Array.isArray(payload.accounts)) return { list: payload.accounts };
  if (Array.isArray(payload.chartOfAccounts)) return { list: payload.chartOfAccounts };
  if (Array.isArray(payload)) return { list: payload };

  const data = payload.data;
  if (Array.isArray(data)) return { list: data };
  if (data && typeof data === "object") {
    if (Array.isArray(data.tree)) return { list: data.tree, nestedHint: true };
    if (Array.isArray(data.nodes)) return { list: data.nodes };
    if (Array.isArray(data.accounts)) return { list: data.accounts };
    if (Array.isArray(data.chartOfAccounts)) return { list: data.chartOfAccounts };
  }
  return { list: null };
};

const countNodes = (tree = []) => {
  let total = 0;
  const walk = (nodes) => {
    nodes.forEach((node) => {
      total += 1;
      if (node.children?.length) walk(node.children);
    });
  };
  walk(tree);
  return total;
};

/**
 * Normalize GET /accounting/coa/tree into PRD shape:
 * { connectedErp, lastSyncAt, syncStatus, tree: COANode[], totalAccounts }
 */
export const normalizeCoaTreeResponse = (payload = {}) => {
  const connectedErp = payload.connectedErp || payload.connected_erp || payload.data?.connectedErp || [];
  const lastSyncAt =
    payload.lastSyncAt || payload.last_sync_at || payload.data?.lastSyncAt || null;
  const syncStatus =
    payload.syncStatus || payload.sync_status || payload.data?.syncStatus || SYNC_STATUS.SYNCED;

  const { list, nestedHint } = extractRawNodeList(payload);
  let tree = [];

  if (Array.isArray(list) && list.length) {
    const hasNested =
      nestedHint ||
      list.some(
        (node) =>
          Array.isArray(node.children) ||
          Array.isArray(node.childNodes) ||
          Array.isArray(node.child_nodes),
      );
    const hasParentLinks = list.some(
      (node) => node.parentId || node.parent_id || node.parentAccountId || node.parent_account_id,
    );

    if (hasNested) {
      tree = retypeTreeByStructure(list.map((node) => normalizeCoaNode(node)));
    } else if (hasParentLinks) {
      tree = nestFlatCoaNodes(list);
    } else {
      // Flat ledgers only — still show them, but they will all be leaf green until BE sends hierarchy
      tree = retypeTreeByStructure(list.map((node) => normalizeCoaNode(node)));
    }
  }

  return {
    connectedErp: Array.isArray(connectedErp) ? connectedErp : connectedErp ? [connectedErp] : [],
    lastSyncAt,
    syncStatus,
    tree,
    totalAccounts:
      payload.totalAccounts ??
      payload.total_accounts ??
      payload.data?.totalAccounts ??
      countNodes(tree),
    message: payload.message,
  };
};

/** Flatten nested COA → explorer rows (category / group / ledger fields). */
export const flattenLedgersFromTree = (tree = []) => {
  const out = [];

  const walk = (nodes, category = "", group = "") => {
    nodes.forEach((node) => {
      if (node.type === COA_TYPE.CATEGORY) {
        walk(node.children || [], node.name, group);
        return;
      }
      if (node.type === COA_TYPE.GROUP) {
        walk(node.children || [], category, node.name);
        return;
      }
      if (node.type === COA_TYPE.LEDGER) {
        out.push({
          ...node,
          category: category || "—",
          group: group || node.parentGroup || "—",
        });
        return;
      }
      // Unknown intermediate — keep walking
      walk(node.children || [], category, group);
    });
  };

  walk(tree);
  return out;
};

export const filterCoaTreeBySearch = (tree = [], search = "") => {
  const query = search.trim().toLowerCase();
  if (!query) return tree;

  const filterNode = (node) => {
    const selfMatch =
      node.name?.toLowerCase().includes(query) ||
      node.code?.toLowerCase().includes(query) ||
      node.ledgerType?.toLowerCase().includes(query) ||
      node.erpId?.toLowerCase().includes(query);

    const children = (node.children || []).map(filterNode).filter(Boolean);
    if (selfMatch || children.length) {
      return children.length ? { ...node, children } : { ...node, children: undefined };
    }
    return null;
  };

  return tree.map(filterNode).filter(Boolean);
};

export const findCategoryNameForLedger = (tree = [], ledgerId) => {
  for (const category of tree) {
    if (category.type !== COA_TYPE.CATEGORY) continue;
    for (const group of category.children || []) {
      for (const ledger of group.children || []) {
        if (ledger.id === ledgerId) return category.name;
      }
      // deeper / tally-style: ledger directly under category
      if (group.type === COA_TYPE.LEDGER && group.id === ledgerId) return category.name;
    }
  }
  return "—";
};

const ACC_STATUS_MAP = {
  [SYNC_STATUS.NOT_READY]: ACC_STATUS.NOT_READY,
  NOT_READY: ACC_STATUS.NOT_READY,
  "Not Ready": ACC_STATUS.NOT_READY,
  [SYNC_STATUS.READY]: ACC_STATUS.READY,
  [SYNC_STATUS.READY_TO_SYNC]: ACC_STATUS.READY,
  READY: ACC_STATUS.READY,
  "Ready": ACC_STATUS.READY,
  [SYNC_STATUS.QUEUED]: ACC_STATUS.QUEUED,
  QUEUED: ACC_STATUS.QUEUED,
  Queued: ACC_STATUS.QUEUED,
  [SYNC_STATUS.SYNCED]: ACC_STATUS.SYNCED,
  SYNCED: ACC_STATUS.SYNCED,
  Synced: ACC_STATUS.SYNCED,
  [SYNC_STATUS.FAILED]: ACC_STATUS.FAILED,
  [SYNC_STATUS.RETRY_REQUIRED]: ACC_STATUS.FAILED,
  FAILED: ACC_STATUS.FAILED,
  Failed: ACC_STATUS.FAILED,
};

const ERP_STATUS_MAP = {
  [SYNC_STATUS.NOT_SYNCED]: ERP_STATUS.NOT_SYNCED,
  NOT_SYNCED: ERP_STATUS.NOT_SYNCED,
  "Not Synced": ERP_STATUS.NOT_SYNCED,
  [SYNC_STATUS.READY_TO_SYNC]: ERP_STATUS.READY_TO_SYNC,
  READY_TO_SYNC: ERP_STATUS.READY_TO_SYNC,
  "Ready to Sync": ERP_STATUS.READY_TO_SYNC,
  [SYNC_STATUS.QUEUED]: ERP_STATUS.NOT_SYNCED,
  [SYNC_STATUS.SYNCED]: ERP_STATUS.SYNCED,
  SYNCED: ERP_STATUS.SYNCED,
  Synced: ERP_STATUS.SYNCED,
  [SYNC_STATUS.FAILED]: ERP_STATUS.FAILED,
  [SYNC_STATUS.RETRY_REQUIRED]: ERP_STATUS.RETRY_REQUIRED,
  RETRY_REQUIRED: ERP_STATUS.RETRY_REQUIRED,
  "Retry Required": ERP_STATUS.RETRY_REQUIRED,
  FAILED: ERP_STATUS.FAILED,
  Failed: ERP_STATUS.FAILED,
  "—": ERP_STATUS.NONE,
  NONE: ERP_STATUS.NONE,
};

export const toAccStatus = (value, fallback = ACC_STATUS.NOT_READY) =>
  ACC_STATUS_MAP[value] || ACC_STATUS_MAP[String(value || "")] || fallback;

export const toErpStatus = (value, { accountingReady } = {}) => {
  if (value === ERP_STATUS.NONE || value === "—" || value == null) {
    if (accountingReady === false) return ERP_STATUS.NONE;
  }
  return ERP_STATUS_MAP[value] || ERP_STATUS_MAP[String(value || "")] || ERP_STATUS.NOT_SYNCED;
};

export const resolveQueueTab = (item = {}) => {
  if (item.tab && Object.values(QUEUE_TAB).includes(item.tab)) return item.tab;
  const objectType = String(item.objectType || item.object_type || "").toUpperCase();
  return OBJECT_TYPE_TO_TAB[objectType] || QUEUE_TAB.INVOICE;
};

/** Normalize a ready-queue row into PRD QueueDoc (+ action helpers). */
export const normalizeQueueItem = (item = {}) => {
  const syncStatus = item.syncStatus || item.sync_status;
  const accStatus = toAccStatus(
    item.accStatus || item.accountingStatus || item.accounting_status || syncStatus,
    item.accountingReady || item.accounting_ready ? ACC_STATUS.READY : ACC_STATUS.NOT_READY,
  );
  const erpStatus = toErpStatus(item.erpStatus || item.erp_status || syncStatus, {
    accountingReady: item.accountingReady ?? item.accounting_ready,
  });

  return {
    id: String(item.id),
    docNo: item.docNo || item.doc_no || item.reference || item.documentNumber || "—",
    vendor: item.vendor || item.vendorName || item.vendor_name || "—",
    amount: Number(item.amount || 0),
    bizStatus: item.bizStatus || item.businessStatus || item.finalStatus || item.final_status || "—",
    syncStatus,
    accStatus,
    erpStatus:
      accStatus === ACC_STATUS.NOT_READY && !item.erpStatus && !item.erp_status
        ? ERP_STATUS.NONE
        : erpStatus,
    tab: resolveQueueTab(item),
    objectType: item.objectType || item.object_type || OBJECT_TYPE.INVOICE,
    objectId: item.objectId || item.object_id,
    source: item.source || item.recordSource || item.record_source || "—",
    sourceSystem: item.sourceSystem || item.source_system || item.erpSource || item.erp_source,
    eligibleForSync: Boolean(
      item.eligibleForSync ??
        item.eligible_for_sync ??
        [ACC_STATUS.READY, ACC_STATUS.FAILED].includes(accStatus),
    ),
    locked: Boolean(item.locked ?? item.isLocked ?? item.is_locked),
    unlockRequestStatus: item.unlockRequestStatus || item.unlock_request_status || null,
    accountingReady: Boolean(item.accountingReady ?? item.accounting_ready),
  };
};

export const normalizeReadyQueueResponse = (payload = {}) => {
  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.results)
      ? payload.results
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
  return { items: rawItems.map(normalizeQueueItem) };
};

export const normalizeLedgerDetailResponse = (payload = {}, fallbackLedger = null) => {
  const ledgerRaw = payload.ledger || payload.data?.ledger || payload;
  const ledger = ledgerRaw?.id || ledgerRaw?.name ? normalizeCoaNode(ledgerRaw) : fallbackLedger;
  const transactionsRaw =
    payload.transactions ||
    payload.data?.transactions ||
    payload.recentTransactions ||
    payload.recent_transactions ||
    [];

  const transactions = (Array.isArray(transactionsRaw) ? transactionsRaw : []).map((tx) => ({
    invoiceId: tx.invoiceId || tx.invoice_id || tx.id,
    invoice: tx.invoice || tx.invoiceNumber || tx.invoice_number || tx.docNo || "—",
    vendor: tx.vendor || tx.vendorName || tx.vendor_name || "—",
    item: tx.item || tx.lineItem || tx.line_item || tx.description || "—",
    qty: tx.qty ?? tx.quantity ?? tx.quantity_received ?? "—",
    amount: Number(tx.amount || 0),
    date: tx.date || tx.invoiceDate || tx.invoice_date || tx.createdAt || tx.created_at,
    status: toErpStatus(tx.status || tx.syncStatus || tx.sync_status || ERP_STATUS.NOT_SYNCED),
  }));

  return { ledger, transactions };
};

export const statusBadgeClass = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("synced") || normalized.includes("approved") || normalized.includes("paid") || normalized === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (normalized.includes("ready") || normalized.includes("queued") || normalized.includes("pending")) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  if (normalized.includes("failed") || normalized.includes("retry") || normalized.includes("inactive")) {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  if (normalized.includes("not synced") || normalized.includes("not ready") || normalized === "draft") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

/** @deprecated */
export const syncStatusLabel = (status) => toAccStatus(status, status || "—");

/** @deprecated — prefer flattenLedgersFromTree */
export const flattenLedgers = (nodes = []) => flattenLedgersFromTree(nodes);

/** @deprecated */
export const buildCoaTree = (nodes = []) => nestFlatCoaNodes(nodes);
