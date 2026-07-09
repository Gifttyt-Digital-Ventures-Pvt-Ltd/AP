import React, { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Download,
  Eye,
  FileText,
  IndianRupee,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

const ALL = "ALL";

const ACCOUNTS = [
  {
    id: "raw-materials",
    name: "Raw Materials",
    code: "5010",
    type: "Expense",
    source: "Tally",
    status: "Active",
    description: "Purchase ledger for material procurement and manufacturing inputs.",
    lastSync: "2026-07-12T10:45:00",
    createdAt: "2026-04-02T09:15:00",
  },
  {
    id: "employee-expense",
    name: "Employee Expense",
    code: "5020",
    type: "Expense",
    source: "Zoho Books",
    status: "Active",
    description: "Travel, stay, reimbursement, and employee expense allocations.",
    lastSync: "2026-07-12T10:45:00",
    createdAt: "2026-04-18T11:20:00",
  },
  {
    id: "office-supplies",
    name: "Office Supplies",
    code: "5040",
    type: "Expense",
    source: "Zoho Books",
    status: "Active",
    description: "Stationery, office consumables, and facility supplies.",
    lastSync: "2026-07-11T17:10:00",
    createdAt: "2026-05-01T12:00:00",
  },
  {
    id: "freight-expense",
    name: "Freight Expense",
    code: "5060",
    type: "Expense",
    source: "Tally",
    status: "Active",
    description: "Transport and logistics cost allocations.",
    lastSync: "2026-07-10T16:30:00",
    createdAt: "2026-05-05T10:40:00",
  },
  {
    id: "input-cgst",
    name: "Input CGST",
    code: "1401",
    type: "Asset",
    source: "Tally",
    status: "Active",
    description: "Input CGST recoverable ledger synchronized from ERP.",
    lastSync: "2026-07-09T08:20:00",
    createdAt: "2026-05-21T11:40:00",
  },
  {
    id: "sundry-creditors",
    name: "Sundry Creditors",
    code: "2100",
    type: "Liability",
    source: "Zoho Books",
    status: "Inactive",
    description: "Vendor payable control account retained for historical visibility.",
    lastSync: "2026-06-28T18:00:00",
    createdAt: "2026-03-11T13:10:00",
  },
];

const LEDGERS = [
  {
    id: "raw-materials",
    ledger: "Raw Materials",
    type: "Expense",
    lineItems: 245,
    invoices: 72,
    vendors: 18,
    totalAmount: 5840000,
    lastUsed: "2026-07-11",
  },
  {
    id: "employee-expense",
    ledger: "Employee Expense",
    type: "Expense",
    lineItems: 83,
    invoices: 31,
    vendors: 12,
    totalAmount: 824000,
    lastUsed: "2026-07-09",
  },
  {
    id: "office-supplies",
    ledger: "Office Supplies",
    type: "Expense",
    lineItems: 41,
    invoices: 19,
    vendors: 8,
    totalAmount: 214000,
    lastUsed: "2026-07-07",
  },
  {
    id: "freight-expense",
    ledger: "Freight Expense",
    type: "Expense",
    lineItems: 56,
    invoices: 23,
    vendors: 10,
    totalAmount: 930000,
    lastUsed: "2026-07-08",
  },
];

const LINE_ITEMS = {
  "raw-materials": [
    { id: "li-1", invoice: "INV-101", vendor: "Tata Steel", item: "Steel Sheet", quantity: 20, amount: 80000, date: "2026-07-10", status: "Approved" },
    { id: "li-2", invoice: "INV-102", vendor: "JSW", item: "Iron Rod", quantity: 50, amount: 120000, date: "2026-07-09", status: "Paid" },
    { id: "li-3", invoice: "INV-108", vendor: "Saksham Test Company", item: "Aluminium Frame", quantity: 14, amount: 56000, date: "2026-07-07", status: "Pending Payment" },
  ],
  "employee-expense": [
    { id: "li-4", invoice: "INV-221", vendor: "Hotel Grand", item: "Hotel Stay", quantity: 3, amount: 42000, date: "2026-07-08", status: "Approved" },
    { id: "li-5", invoice: "INV-224", vendor: "City Cabs", item: "Airport Transfer", quantity: 8, amount: 18000, date: "2026-07-06", status: "Paid" },
  ],
  "office-supplies": [
    { id: "li-6", invoice: "INV-301", vendor: "Office Mart", item: "Printer Paper", quantity: 40, amount: 24000, date: "2026-07-03", status: "Approved" },
  ],
  "freight-expense": [
    { id: "li-7", invoice: "INV-401", vendor: "Fast Freight", item: "Transport Charges", quantity: 1, amount: 95000, date: "2026-07-08", status: "Pending Payment" },
  ],
};

// const WORKFLOW_STEPS = [
//   "Zoho Books / Tally",
//   "Sync Chart of Accounts",
//   "Chart of Accounts",
//   "Invoice Upload",
//   "AI extracts Line Items",
//   "Finance assigns Ledger",
//   "Invoice Approved",
//   "Ledger Explorer",
//   "Ledger",
//   "Invoice",
//   "Line Item",
// ];

const formatDateTime = (value) => {
  if (!value) return "-";
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

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const statusBadgeClass = (status = "") => {
  const normalized = String(status).toLowerCase();
  if (normalized.includes("active") || normalized.includes("approved") || normalized.includes("paid") || normalized.includes("synced")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (normalized.includes("pending")) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

const PageShell = ({ title, subtitle, current, children, actions, backTo }) => {
  const navigate = useNavigate();
  const showBack = Boolean(current);

  const handleBack = () => {
    navigate(backTo || "/accounting");
  };

  return (
    <div className="space-y-6" data-testid="accounting-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-start gap-3">
            {showBack ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleBack}
                className="mt-1 h-9 w-9 shrink-0 rounded-full"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold font-['Manrope'] text-primary">{title}</h1>
              {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
};

const MetricCard = ({ title, value, subtitle, icon: Icon }) => (
  <Card className="shadow-sm">
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </CardContent>
  </Card>
);

const AccountingDashboard = ({ onSync, syncing }) => {
  const navigate = useNavigate();
  const totalSpend = LEDGERS.reduce((sum, row) => sum + row.totalAmount, 0);
  const totalLineItems = LEDGERS.reduce((sum, row) => sum + row.lineItems, 0);

  return (
    <PageShell
      title="Accounting"
      subtitle="Operational visibility into ERP ledgers, invoice line items, and accounting assignments."
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Chart of Accounts</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Read-only ledger master synchronized from ERP.</p>
              </div>
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Synced</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard title="Total Accounts" value="1,245" />
              <MetricCard title="Connected ERP" value="Zoho Books" />
              <MetricCard title="Last Sync" value="12 Jul 2026" subtitle="10:45 AM" />
              <MetricCard title="Sync Status" value="Synced" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/accounting/chart-of-accounts")}>View Chart of Accounts</Button>
              <Button variant="outline" onClick={onSync} disabled={syncing}>
                {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sync Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Ledger Explorer</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Browse invoice line items grouped by accounting ledger.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard title="Total Ledgers" value={LEDGERS.length} />
              <MetricCard title="Line Items" value={totalLineItems.toLocaleString("en-IN")} />
              <MetricCard title="Total Spend" value="₹5.8 Cr" subtitle={formatCurrency(totalSpend)} />
            </div>
            <Button onClick={() => navigate("/accounting/ledger-explorer")}>
              View Ledgers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Accounting Workflow</CardTitle>
          <p className="text-sm text-muted-foreground">From ERP ledger sync to invoice line-item visibility.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {WORKFLOW_STEPS.map((step, index) => (
              <div key={step} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-800">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card> */}
    </PageShell>
  );
};

const ChartOfAccounts = ({ onSync, syncing }) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [sourceFilter, setSourceFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ACCOUNTS.filter((account) => {
      const matchesSearch =
        !query ||
        account.name.toLowerCase().includes(query) ||
        account.code.toLowerCase().includes(query);
      const matchesType = typeFilter === ALL || account.type === typeFilter;
      const matchesSource = sourceFilter === ALL || account.source === sourceFilter;
      const matchesStatus = statusFilter === ALL || account.status === statusFilter;
      return matchesSearch && matchesType && matchesSource && matchesStatus;
    });
  }, [search, sourceFilter, statusFilter, typeFilter]);

  return (
    <PageShell
      title="Chart of Accounts"
      current="Chart of Accounts"
      subtitle="Read-only ledger master synchronized from your ERP."
      actions={
        <>
          <Button variant="outline" onClick={() => toast.info("Dummy refresh completed")}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={onSync} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Sync Now
          </Button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Accounts" value={ACCOUNTS.length} icon={BookOpen} />
        <MetricCard title="Connected ERP" value="Zoho + Tally" icon={Layers} />
        <MetricCard title="Last Sync" value="12 Jul 2026" subtitle="10:45 AM" icon={RefreshCw} />
        <MetricCard title="Sync Status" value="Synced" icon={Sparkles} />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ledger..." className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Ledger Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All ledger types</SelectItem>
                <SelectItem value="Asset">Asset</SelectItem>
                <SelectItem value="Expense">Expense</SelectItem>
                <SelectItem value="Liability">Liability</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger><SelectValue placeholder="ERP Source" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All ERP sources</SelectItem>
                <SelectItem value="Zoho Books">Zoho Books</SelectItem>
                <SelectItem value="Tally">Tally</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        <div className="max-h-[62vh] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              <TableRow>
                <TableHead>Ledger Name</TableHead>
                <TableHead>Ledger Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>ERP Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((account) => (
                <TableRow key={account.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAccount(account)}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.code}</TableCell>
                  <TableCell>{account.type}</TableCell>
                  <TableCell>{account.source}</TableCell>
                  <TableCell>
                    <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass(account.status)}`}>
                      {account.status}
                    </span>
                  </TableCell>
                  <TableCell>{formatDateTime(account.lastSync)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Sheet open={Boolean(selectedAccount)} onOpenChange={(open) => !open && setSelectedAccount(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedAccount?.name || "Ledger details"}</SheetTitle>
            <SheetDescription>Read-only ledger details. Editing is disabled because ERP is the source of truth.</SheetDescription>
          </SheetHeader>
          {selectedAccount ? (
            <div className="mt-6 space-y-4">
              <Badge className="border-blue-200 bg-blue-50 text-blue-700">Managed in {selectedAccount.source}</Badge>
              {[
                ["Ledger Name", selectedAccount.name],
                ["Ledger Code", selectedAccount.code],
                ["Ledger Type", selectedAccount.type],
                ["Description", selectedAccount.description],
                ["ERP Source", selectedAccount.source],
                ["Last Sync", formatDateTime(selectedAccount.lastSync)],
                ["Created Date", formatDateTime(selectedAccount.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-medium text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

const LedgerExplorer = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("highest");
  const navigate = useNavigate();
  const totalSpend = LEDGERS.reduce((sum, row) => sum + row.totalAmount, 0);
  const totalLineItems = LEDGERS.reduce((sum, row) => sum + row.lineItems, 0);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = LEDGERS.filter((ledger) =>
      !query ||
      ledger.ledger.toLowerCase().includes(query) ||
      ledger.type.toLowerCase().includes(query),
    );
    return [...filtered].sort((a, b) => {
      if (sort === "lowest") return a.totalAmount - b.totalAmount;
      if (sort === "recent") return new Date(b.lastUsed) - new Date(a.lastUsed);
      return b.totalAmount - a.totalAmount;
    });
  }, [search, sort]);

  return (
    <PageShell
      title="Ledger Explorer"
      current="Ledger Explorer"
      subtitle="Browse invoice line items grouped by accounting ledger."
      actions={<Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Ledgers" value={LEDGERS.length} icon={BookOpen} />
        <MetricCard title="Total Spend" value={formatCurrency(totalSpend)} icon={IndianRupee} />
        <MetricCard title="Total Vendors" value="48" icon={Layers} />
        <MetricCard title="Total Line Items" value={totalLineItems.toLocaleString("en-IN")} icon={FileText} />
      </div>

      <Card className="shadow-sm">
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ledger, vendor, invoice, item..." className="pl-9" />
          </div>
          <Select defaultValue={ALL}>
            <SelectTrigger><SelectValue placeholder="Ledger Type" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All ledger types</SelectItem><SelectItem value="Expense">Expense</SelectItem></SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="highest">Highest Spend</SelectItem>
              <SelectItem value="lowest">Lowest Spend</SelectItem>
              <SelectItem value="recent">Recently Used</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue={ALL}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All statuses</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Paid">Paid</SelectItem></SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Ledger</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Line Items</TableHead>
              <TableHead>Invoices</TableHead>
              <TableHead>Vendors</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((ledger) => (
              <TableRow key={ledger.id}>
                <TableCell className="font-medium">{ledger.ledger}</TableCell>
                <TableCell>{ledger.type}</TableCell>
                <TableCell>{ledger.lineItems}</TableCell>
                <TableCell>{ledger.invoices}</TableCell>
                <TableCell>{ledger.vendors}</TableCell>
                <TableCell>{formatCurrency(ledger.totalAmount)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/accounting/ledger-explorer/${ledger.id}`)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
};

const LedgerDetail = () => {
  const { ledgerId } = useParams();
  const ledger = LEDGERS.find((item) => item.id === ledgerId) || LEDGERS[0];
  const rows = LINE_ITEMS[ledger.id] || [];

  return (
    <PageShell
      title={ledger.ledger}
      current={`Ledger Explorer > ${ledger.ledger}`}
      subtitle="Invoice line items mapped to this accounting ledger."
      backTo="/accounting/ledger-explorer"
    >
      <div className="grid gap-4 md:grid-cols-5">
        <MetricCard title="Total Spend" value={formatCurrency(ledger.totalAmount)} />
        <MetricCard title="Total Invoices" value={ledger.invoices} />
        <MetricCard title="Total Line Items" value={ledger.lineItems} />
        <MetricCard title="Vendors" value={ledger.vendors} />
        <MetricCard title="Last Used" value={formatDate(ledger.lastUsed)} />
      </div>
      <Card className="overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toast.info(`Open invoice detail: ${row.invoice}`)}>
                <TableCell className="font-medium">{row.invoice}</TableCell>
                <TableCell>{row.vendor}</TableCell>
                <TableCell>{row.item}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{formatCurrency(row.amount)}</TableCell>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell><span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass(row.status)}`}>{row.status}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
};

const Accounting = () => {
  const location = useLocation();
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      toast.success("Chart of Accounts sync completed");
    }, 900);
  };

  if (location.pathname.includes("/chart-of-accounts")) {
    return <ChartOfAccounts onSync={handleSync} syncing={syncing} />;
  }
  if (location.pathname.includes("/ledger-explorer/")) {
    return <LedgerDetail />;
  }
  if (location.pathname.includes("/ledger-explorer")) {
    return <LedgerExplorer />;
  }
  return <AccountingDashboard onSync={handleSync} syncing={syncing} />;
};

export default Accounting;
