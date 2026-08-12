import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { useRBAC } from "../../contexts/RBACContext";
import { Button } from "../../components/ui/button";
import AppDataTable from "../../components/common/AppDataTable";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { GATE_STATE } from "./constants";
import useBankingSetup from "./hooks/useBankingSetup";
import {
  useGetBankingAccountBalanceQuery,
  useGetBankingAccountStatementQuery,
  useRegisterBeneficiaryMutation,
  useValidateBeneficiaryMutation,
} from "../../Services/apis/connectedBankingApi";
import { useActionGuard } from "../../hooks/useActionGuard";
import { toast } from "sonner";
import BeneficiariesTable from "./components/BeneficiariesTable";
import BeneficiaryForm from "./components/BeneficiaryForm";

const SETUP_STATUS_MESSAGES = {
  [GATE_STATE.ACCOUNT_PENDING]: "Submit a bank account in Settings → Connected Banking.",
  [GATE_STATE.PENDING_VERIFICATION]: "",
  [GATE_STATE.ACTION_REQUIRED]: "Action required. Review the rejection reason and resubmit the corrected account details.",
  [GATE_STATE.CONFIGURED]: "No active bank account is available for payments.",
};

const formatMoney = (value) =>
  value == null
    ? "—"
    : `₹${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const getAccountLabel = (account = {}) =>
  account.bankName || account.bank || "IDFC Bank";

const getAccountNumber = (account = {}) =>
  account.accountNumber || account.maskedAccountNumber || account.account_number || "—";

const getMaskedAccount = (account = {}) => {
  const value = String(getAccountNumber(account));
  if (value === "—") return value;
  return value.length > 4 ? `XXXX${value.slice(-4)}` : value;
};

const getAvailableBalance = (account = {}) =>
  account.availableBalance ?? account.available_balance ?? account.balance ?? account.currentBalance ?? null;

const getBalanceFetchedAt = (balance = {}, account = {}) =>
  balance.balanceFetchedAt ??
  balance.balance_fetched_at ??
  balance.fetchedAt ??
  balance.fetched_at ??
  account.balanceFetchedAt ??
  account.balance_fetched_at ??
  account.updatedAt ??
  account.updated_at ??
  null;

const formatSyncTime = (value) => {
  if (!value) return "Not synced yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced yet";
  return `Last synced ${date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const getAccountId = (account = {}, index = 0) =>
  String(account.id || account.accountNumber || account.account_number || index);

const getAccountSelectLabel = (account = {}) =>
  `${getAccountLabel(account)} · ${getMaskedAccount(account)}`;

const BENEFICIARY_PAGE_SIZE = 10;

const getVisiblePages = (currentPage, totalPages, maxVisible = 5) => {
  if (totalPages <= 0) return [];
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const start = Math.min(Math.max(currentPage - 2, 0), totalPages - maxVisible);
  return Array.from({ length: maxVisible }, (_, index) => start + index);
};

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDefaultStatementRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return {
    fromDate: toDateInputValue(from),
    toDate: toDateInputValue(to),
  };
};

const normalizeStatementDate = (value) => {
  const text = String(value || "").trim();
  if (/^\d{6}$/.test(text)) {
    const day = text.slice(0, 2);
    const month = text.slice(2, 4);
    const year = Number(text.slice(4, 6));
    return `20${String(year).padStart(2, "0")}-${month}-${day}`;
  }
  return text;
};

const formatActivityDate = (value) => {
  if (!value) return "—";
  const normalizedDate = normalizeStatementDate(value);
  const date = new Date(normalizedDate);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeActivityStatus = (status = "") => {
  const value = String(status || "").toUpperCase();
  if (["SUCCESS", "COMPLETED", "PAID", "RELEASED"].includes(value)) return "Success";
  if (["FAILED", "ERROR", "RETURNED", "REJECTED"].includes(value)) return "Failed";
  return "Pending";
};

const getActivityDirection = (transaction = {}) => {
  const value = String(transaction.type || transaction.transactionType || transaction.transaction_type || "").toUpperCase();
  if (value.includes("CREDIT") || value === "CR") return "credit";
  return "debit";
};

const csvEscape = (value) => {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const StatusPill = ({ status }) => {
  const className =
    status === "Success"
      ? "border-green-200 bg-green-50 text-green-800"
      : status === "Pending"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-red-200 bg-red-50 text-red-800";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${className}`}>
      {status}
    </span>
  );
};

const linkedAccountsTableHeader = [
  {
    key: "bank",
    title: "Bank",
    cellClassName: "font-medium",
    render: (account) => getAccountLabel(account),
  },
  {
    key: "accountType",
    title: "Account Type",
    render: (account) => account.accountType || "Current",
  },
  {
    key: "accountNumber",
    title: "Account Number",
    render: (account) => getMaskedAccount(account),
  },
  {
    key: "ifsc",
    title: "IFSC",
    render: (account) => account.ifsc || account.ifscCode || "—",
  },
  {
    key: "availableBalance",
    title: "Available Balance",
    headerClassName: "text-right",
    cellClassName: "text-right font-semibold",
    render: (account) => formatMoney(getAvailableBalance(account)),
  },
  {
    key: "status",
    title: "Status",
    render: () => <StatusPill status="Success" />,
  },
];

const activityTableHeader = [
  {
    key: "date",
    title: "Date",
    cellClassName: "text-muted-foreground",
  },
  {
    key: "ref",
    title: "Reference",
    cellClassName: "font-mono text-xs",
  },
  {
    key: "type",
    title: "Type",
    render: (item) => (
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${
          item.status === "Failed"
            ? "bg-red-50 text-red-600"
            : item.direction === "debit"
              ? "bg-amber-50 text-amber-700"
              : "bg-primary/10 text-primary"
        }`}>
          {item.direction === "debit" ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownLeft className="h-4 w-4" />
          )}
        </span>
        {item.type}
      </div>
    ),
  },
  {
    key: "vendor",
    title: "Vendor / Payee",
    cellClassName: "font-medium",
  },
  {
    key: "amount",
    title: "Amount",
    headerClassName: "text-right",
    cellClassName: "text-right font-semibold",
    render: (item) => (
      <span className={item.direction === "debit" ? "text-red-600" : ""}>
        {item.direction === "debit" && item.amount != null ? "-" : ""}
        {formatMoney(item.amount)}
      </span>
    ),
  },
  {
    key: "status",
    title: "Status",
    render: (item) => <StatusPill status={item.status} />,
  },
];

const NoBankState = () => (
  <div className="flex flex-col items-center rounded-lg border border-border bg-card px-6 py-16 text-center shadow-sm">
    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
      <CreditCard className="h-8 w-8 text-primary" />
    </div>
    <h2 className="text-xl font-semibold">No bank accounts have been submitted.</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
      Submit a bank account verification request to start connected banking setup.
    </p>
    <Button asChild className="mt-6">
      <Link to="/settings?tab=banking">
        <Plus className="mr-2 h-4 w-4" />
        Add Bank Account
      </Link>
    </Button>
  </div>
);

const ConnectedBanking = () => {
  const defaultStatementRange = useMemo(() => getDefaultStatementRange(), []);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityDateFrom, setActivityDateFrom] = useState(defaultStatementRange.fromDate);
  const [activityDateTo, setActivityDateTo] = useState(defaultStatementRange.toDate);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [beneficiaryDialogOpen, setBeneficiaryDialogOpen] = useState(false);
  const [bankingTab, setBankingTab] = useState("activity");
  const [beneficiaryPage, setBeneficiaryPage] = useState(0);
  const { isConnectedBankingEnabled } = useRBAC();
  const { guardAction, canPerformAction } = useActionGuard();
  const skip = !isConnectedBankingEnabled;
  const beneficiaryOffset = beneficiaryPage * BENEFICIARY_PAGE_SIZE;

  const {
    accounts,
    paymentReadyAccounts,
    beneficiaries,
    beneficiariesMeta,
    gateState,
    isSetupReady,
    isLoading,
    isFetching,
    refetchAll,
    refetchBeneficiaries,
  } = useBankingSetup({
    skip,
    beneficiaryLimit: BENEFICIARY_PAGE_SIZE,
    beneficiaryOffset,
  });
  const [validateBeneficiary, { isLoading: validatingBeneficiary }] = useValidateBeneficiaryMutation();
  const [registerBeneficiary, { isLoading: savingBeneficiary }] = useRegisterBeneficiaryMutation();
  const canManageBeneficiaries = canPerformAction("banking.addBeneficiary");
  const hasPaymentReadyAccount = paymentReadyAccounts.length > 0;

  const selectedAccount = useMemo(() => {
    if (!accounts.length) return null;
    return accounts.find((account, index) => getAccountId(account, index) === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);
  const selectedBalanceAccountId = selectedAccount ? getAccountId(selectedAccount) : "";
  const hasStatementDateRange = Boolean(activityDateFrom && activityDateTo);
  const {
    data: selectedAccountBalance,
    isFetching: isBalanceFetching,
    refetch: refetchBalance,
  } = useGetBankingAccountBalanceQuery(selectedBalanceAccountId, {
    skip: skip || !selectedBalanceAccountId,
  });
  const {
    data: selectedAccountStatement,
    isFetching: isStatementFetching,
    refetch: refetchStatement,
  } = useGetBankingAccountStatementQuery(
    {
      accountId: selectedBalanceAccountId,
      fromDate: activityDateFrom,
      toDate: activityDateTo,
    },
    { skip: skip || !selectedBalanceAccountId || !hasStatementDateRange },
  );
  const selectedAccountWithBalance = useMemo(
    () =>
      selectedAccount
        ? {
            ...selectedAccount,
            ...(selectedAccountBalance || {}),
          }
        : null,
    [selectedAccount, selectedAccountBalance],
  );
  const accountActivity = useMemo(
    () =>
      (selectedAccountStatement?.transactions || []).map((transaction, index) => {
        const transactionDate = normalizeStatementDate(
          transaction.transactionDate || transaction.date || transaction.valueDate,
        );
        return {
          id: transaction.id || `${selectedBalanceAccountId}-activity-${index}`,
          accountId: selectedBalanceAccountId,
          accountLabel: selectedAccountWithBalance
            ? getAccountSelectLabel(selectedAccountWithBalance)
            : "",
          isoDate: transactionDate ? String(transactionDate).slice(0, 10) : "",
          date: formatActivityDate(transactionDate),
          ref: transaction.utr || transaction.referenceNumber || "—",
          type: transaction.description || transaction.type || "Bank Transaction",
          vendor: transaction.payeeName || transaction.vendorName || transaction.description || "—",
          amount: transaction.amount ?? null,
          direction: getActivityDirection(transaction),
          status: normalizeActivityStatus(transaction.rawStatus || transaction.status),
        };
      }),
    [selectedAccountStatement, selectedBalanceAccountId, selectedAccountWithBalance],
  );
  const filteredActivity = useMemo(
    () =>
      accountActivity.filter((item) => {
        const query = activitySearch.toLowerCase();
        const matchesSelectedAccount = !selectedAccountId || item.accountId === selectedAccountId;
        const matchesDateFrom = !activityDateFrom || item.isoDate >= activityDateFrom;
        const matchesDateTo = !activityDateTo || item.isoDate <= activityDateTo;
        const matchesSearch =
          !query ||
          item.ref.toLowerCase().includes(query) ||
          item.vendor.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query);
        return (
          matchesSelectedAccount &&
          matchesDateFrom &&
          matchesDateTo &&
          matchesSearch
        );
      }),
    [accountActivity, activityDateFrom, activityDateTo, activitySearch, selectedAccountId],
  );

  const beneficiaryRows = useMemo(
    () =>
      beneficiaries.map((beneficiary, index) => ({
        ...beneficiary,
        id: beneficiary.id ?? beneficiary.bnfId ?? beneficiary.beneficiaryId ?? index,
        vendorId: beneficiary.vendorId ?? beneficiary.vendor_id,
        vendorBankAccountId: beneficiary.vendorBankAccountId ?? beneficiary.vendor_bank_account_id,
        vendorName: beneficiary.vendorName ?? beneficiary.name ?? "—",
        name: beneficiary.name ?? "—",
        bankName: beneficiary.bankName ?? "—",
        accountNumber: beneficiary.accountNumber ?? "—",
        ifsc: beneficiary.ifsc ?? "—",
        status: beneficiary.status ?? beneficiary.normalizedStatus ?? "UNVERIFIED",
        bankVerificationStatus: beneficiary.bankVerificationStatus,
        availableAt: beneficiary.availableAt ?? beneficiary.available_at,
        bankAccountId: beneficiary.bankAccountId ?? beneficiary.bank_account_id,
      })),
    [beneficiaries],
  );

  const beneficiaryPagination = useMemo(() => {
    const total = beneficiariesMeta?.total ?? beneficiaryRows.length;
    const totalPages = Math.max(1, Math.ceil(total / BENEFICIARY_PAGE_SIZE));
    const safePage = Math.min(beneficiaryPage, totalPages - 1);
    const start = safePage * BENEFICIARY_PAGE_SIZE;
    const end = Math.min(start + beneficiaryRows.length, total);
    return {
      total,
      totalPages,
      currentPage: safePage,
      start,
      end,
      startRecord: total === 0 ? 0 : start + 1,
      endRecord: end,
      hasPrevious: safePage > 0,
      hasNext: safePage < totalPages - 1,
    };
  }, [beneficiariesMeta?.total, beneficiaryPage, beneficiaryRows.length]);

  const paginatedBeneficiaries = useMemo(
    () => beneficiaryRows,
    [beneficiaryRows],
  );

  const handleExportActivity = () => {
    const headers = ["Date", "Reference", "Type", "Vendor / Payee", "Amount", "Status", "Bank Account"];
    const rows = filteredActivity.map((item) => [
      item.date,
      item.ref,
      item.type,
      item.vendor,
      item.amount == null ? "" : item.amount,
      item.status,
      item.accountLabel,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `banking-activity-${selectedAccountId || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const handleRefreshBalance = () => {
    setRefreshingBalance(true);
    const refresh = selectedBalanceAccountId ? refetchBalance() : refetchAll();
    refresh.finally(() => {
      setRefreshingBalance(false);
    });
  };
  const handleViewStatement = () => {
    if (!selectedBalanceAccountId) return;
    if (!hasStatementDateRange) return;
    refetchStatement();
  };

  const handleVerifyBeneficiary = async (payload) => {
    if (!guardAction("banking.verifyBeneficiary")) return null;
    try {
      const response = await validateBeneficiary(payload).unwrap();
      toast.success("Beneficiary verified");
      return response;
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || "Beneficiary verification failed");
      return null;
    }
  };

  const handleSaveBeneficiary = async (payload) => {
    if (!guardAction("banking.addBeneficiary")) return false;
    try {
      await registerBeneficiary(payload).unwrap();
      await refetchBeneficiaries();
      toast.success("Beneficiary saved successfully");
      setBeneficiaryDialogOpen(false);
      return true;
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || "Failed to save beneficiary");
      return false;
    }
  };

  const handleRetryBeneficiary = async (beneficiary) => {
    const payload = {
      bankAccountId:
        beneficiary.bankAccountId ||
        beneficiary.bank_account_id ||
        paymentReadyAccounts[0]?.id ||
        paymentReadyAccounts[0]?.accountNumber,
      name: beneficiary.name || beneficiary.beneficiaryName || "",
      accountNumber: beneficiary.accountNumber || beneficiary.account_number || "",
      ifsc: beneficiary.ifsc || beneficiary.ifscCode || beneficiary.ifsc_code || "",
      vendorId: beneficiary.vendorId || beneficiary.vendor_id || undefined,
      payeeType: "ACCOUNT",
    };
    const verified = await handleVerifyBeneficiary(payload);
    if (!verified) return false;
    return handleSaveBeneficiary({
      ...payload,
      validationReference:
        verified.validationReference ||
        verified.referenceId ||
        verified.correlationId,
      verified: true,
    });
  };

  useEffect(() => {
    if (!accounts.length) {
      setSelectedAccountId("");
      return;
    }

    const hasSelectedAccount = accounts.some(
      (account, index) => getAccountId(account, index) === selectedAccountId,
    );
    if (!hasSelectedAccount) {
      setSelectedAccountId(getAccountId(accounts[0], 0));
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (beneficiaryPage <= beneficiaryPagination.totalPages - 1) return;
    setBeneficiaryPage(Math.max(beneficiaryPagination.totalPages - 1, 0));
  }, [beneficiaryPage, beneficiaryPagination.totalPages]);

  const bankingRefreshing = isFetching || isStatementFetching;

  if (!isConnectedBankingEnabled) {
    return (
      <div className="p-6 text-muted-foreground">
        Connected Banking is not enabled for your organisation.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const setupMessage = SETUP_STATUS_MESSAGES[gateState];

  return (
    <div data-testid="connected-banking-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Connected Banking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View saved bank account details and setup readiness.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetchAll}
          disabled={bankingRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${bankingRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {!isSetupReady ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {setupMessage}{" "}
          {gateState === GATE_STATE.ACCOUNT_PENDING ||
          gateState === GATE_STATE.ACTION_REQUIRED ||
          gateState === GATE_STATE.CONFIGURED ? (
            <Link to="/settings?tab=banking" className="font-medium underline underline-offset-2">
              Go to Settings
            </Link>
          ) : null}
        </div>
      ) : null}

      {!accounts.length ? (
        <NoBankState />
      ) : (
        <>
          <section className="overflow-hidden rounded-lg border border-border bg-primary text-primary-foreground shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/15">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{getAccountLabel(selectedAccountWithBalance)}</p>
                  <p className="text-sm text-primary-foreground/75">
                    {selectedAccountWithBalance?.accountType || "Current"} Account · {getMaskedAccount(selectedAccountWithBalance)}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-80">
                <label className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">
                  Select Account
                </label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="border-white/25 bg-white/10 text-primary-foreground">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account, index) => {
                      const accountId = getAccountId(account, index);
                      return (
                        <SelectItem key={accountId} value={accountId}>
                          {getAccountSelectLabel(account)}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-5 px-6 pb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/65">
                  Available Balance
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {isBalanceFetching && getAvailableBalance(selectedAccountWithBalance) == null
                    ? "Fetching..."
                    : formatMoney(getAvailableBalance(selectedAccountWithBalance))}
                </p>
                <p className="mt-1 text-xs text-primary-foreground/65">
                  {formatSyncTime(getBalanceFetchedAt(selectedAccountBalance, selectedAccountWithBalance))}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="secondary">
                <Link to="/settings?tab=banking">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Account
                </Link>
              </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRefreshBalance}
                  disabled={refreshingBalance || isBalanceFetching || !selectedBalanceAccountId}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshingBalance || isBalanceFetching ? "animate-spin" : ""}`} />
                  Refresh Balance
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleViewStatement}
                  disabled={!selectedBalanceAccountId || !hasStatementDateRange || isStatementFetching}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {isStatementFetching ? "Loading Statement..." : "View Statement"}
                </Button>
                {/* <Button variant="secondary" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  Account Details
                </Button> */}
              </div>
            </div>
          </section>

          {hasPaymentReadyAccount ? (
            <Tabs value={bankingTab} onValueChange={setBankingTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
                <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-0">
                <section className="rounded-lg border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                  <div>
                    <h2 className="font-semibold">Recent Banking Activity</h2>
                    <p className="text-sm text-muted-foreground">
                      Activity for {selectedAccount ? getAccountSelectLabel(selectedAccount) : "the selected account"}.
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-end justify-end gap-3 lg:w-auto">
                    <div>
                      <label className="text-xs text-muted-foreground">From</label>
                      <Input
                        type="date"
                        value={activityDateFrom}
                        onChange={(event) => setActivityDateFrom(event.target.value)}
                        className="h-9 w-full sm:w-36"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">To</label>
                      <Input
                        type="date"
                        value={activityDateTo}
                        onChange={(event) => setActivityDateTo(event.target.value)}
                        className="h-9 w-full sm:w-36"
                      />
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={activitySearch}
                        onChange={(event) => setActivitySearch(event.target.value)}
                        placeholder="Search reference, vendor or type..."
                        className="h-9 pl-9"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActivityDateFrom(defaultStatementRange.fromDate);
                        setActivityDateTo(defaultStatementRange.toDate);
                      }}
                    >
                      Reset Dates
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportActivity}
                      disabled={filteredActivity.length === 0}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto px-4 pb-4">
                  <AppDataTable
                    tableHeader={activityTableHeader}
                    tableData={filteredActivity}
                    tableClassName="min-w-[960px]"
                    tableContainerClassName="overflow-visible"
                    headClassName="border-b border-border bg-muted shadow-sm"
                    emptyMessage={
                      hasStatementDateRange
                        ? "No banking activity found."
                        : "Select From and To dates to view banking activity."
                    }
                    stickyHeader={false}
                  />
                </div>
              </section>
              </TabsContent>

              <TabsContent value="beneficiaries" className="mt-0">
                <section className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">Beneficiaries</h2>
                    <p className="text-sm text-muted-foreground">
                      Vendor bank accounts available for beneficiary verification.
                    </p>
                  </div>
                  {canManageBeneficiaries ? (
                    <Button size="sm" onClick={() => setBeneficiaryDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Beneficiary
                    </Button>
                  ) : null}
                </div>
                <BeneficiariesTable
                  beneficiaries={paginatedBeneficiaries}
                  canManage={canManageBeneficiaries}
                  onRegister={handleRetryBeneficiary}
                  showBankVerificationStatus={isConnectedBankingEnabled}
                  footer={
                    <div className="flex shrink-0 flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">
                        Showing {beneficiaryPagination.startRecord}-{beneficiaryPagination.endRecord} of{" "}
                        {beneficiaryPagination.total.toLocaleString("en-IN")}
                      </p>
                      {beneficiaryPagination.totalPages > 1 ? (
                        <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                href="#"
                                onClick={(event) => {
                                  event.preventDefault();
                                  setBeneficiaryPage((page) => Math.max(page - 1, 0));
                                }}
                                className={!beneficiaryPagination.hasPrevious ? "pointer-events-none opacity-50" : undefined}
                              />
                            </PaginationItem>
                            {getVisiblePages(beneficiaryPagination.currentPage, beneficiaryPagination.totalPages).map((pageNumber) => (
                              <PaginationItem key={pageNumber}>
                                <PaginationLink
                                  href="#"
                                  isActive={pageNumber === beneficiaryPagination.currentPage}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    setBeneficiaryPage(pageNumber);
                                  }}
                                >
                                  {pageNumber + 1}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                href="#"
                                onClick={(event) => {
                                  event.preventDefault();
                                  setBeneficiaryPage((page) => Math.min(page + 1, beneficiaryPagination.totalPages - 1));
                                }}
                                className={!beneficiaryPagination.hasNext ? "pointer-events-none opacity-50" : undefined}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      ) : null}
                    </div>
                  }
                />
              </section>
              </TabsContent>
            </Tabs>
          ) : null}

          <Dialog open={beneficiaryDialogOpen} onOpenChange={setBeneficiaryDialogOpen}>
            <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add Beneficiary</DialogTitle>
              </DialogHeader>
              <BeneficiaryForm
                accounts={paymentReadyAccounts}
                vendors={beneficiaryRows}
                beneficiaries={beneficiaries}
                canManage={canManageBeneficiaries}
                validating={validatingBeneficiary}
                saving={savingBeneficiary}
                onVerify={handleVerifyBeneficiary}
                onSave={handleSaveBeneficiary}
                framed={false}
              />
            </DialogContent>
          </Dialog>

        </>
      )}
    </div>
  );
};

export default ConnectedBanking;
