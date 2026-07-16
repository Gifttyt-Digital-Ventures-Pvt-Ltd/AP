import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ChevronLeft, Loader2, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { useActionGuard } from "../../../hooks/useActionGuard";
import {
  useCreateAccountCategoryMutation,
  useCreateAccountGroupMutation,
  useCreateLedgerMutation,
  useGetCoaTreeQuery,
  useGetLedgerQuery,
  useSyncCoaMutation,
  useUpdateAccountCategoryMutation,
  useUpdateAccountGroupMutation,
  useUpdateLedgerMutation,
} from "../../../Services/apis/accountingApi";
import { ACCOUNT_STATUS, COA_TYPE, ERP_SOURCE_LABELS } from "../constants";
import {
  filterCoaTreeBySearch,
  findCategoryNameForLedger,
  formatCurrencyCompact,
  formatDate,
  formatDateTime,
  getAccountingErrorMessage,
  statusBadgeClass,
} from "../utils/coaUtils";
import CoaTreePanel from "./CoaTreePanel";
import LedgerFormDrawer from "./LedgerFormDrawer";

const ChartOfAccounts = () => {
  const navigate = useNavigate();
  const { guardAction, canPerformAction } = useActionGuard();
  const canSync = canPerformAction("accounting.coa.sync");
  const canCreateLedger = canPerformAction("accounting.ledger.create");
  const canEditLedger = canPerformAction("accounting.ledger.edit");

  const { data, isLoading, isError, error, refetch, isFetching } = useGetCoaTreeQuery();
  const [syncCoa, { isLoading: syncing }] = useSyncCoaMutation();
  const [createCategory, { isLoading: creatingCategory }] = useCreateAccountCategoryMutation();
  const [updateCategory, { isLoading: updatingCategory }] = useUpdateAccountCategoryMutation();
  const [createGroup, { isLoading: creatingGroup }] = useCreateAccountGroupMutation();
  const [updateGroup, { isLoading: updatingGroup }] = useUpdateAccountGroupMutation();
  const [createLedger, { isLoading: creatingLedger }] = useCreateLedgerMutation();
  const [updateLedger, { isLoading: updatingLedger }] = useUpdateLedgerMutation();

  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [ledgerDrawer, setLedgerDrawer] = useState({
    open: false,
    mode: "create",
    entityType: COA_TYPE.LEDGER,
    ledger: null,
  });

  const tree = data?.tree || [];
  const filteredTree = useMemo(
    () => filterCoaTreeBySearch(tree, search),
    [tree, search],
  );

  const ledger =
    selectedNode?.type === COA_TYPE.LEDGER && !selectedNode?.children?.length
      ? selectedNode
      : null;

  const { data: ledgerDetail, isLoading: ledgerLoading } = useGetLedgerQuery(ledger?.id, {
    skip: !ledger?.id,
  });

  const transactions = ledgerDetail?.transactions || [];
  const detailLedger = ledgerDetail?.ledger || ledger;

  const connectedLabel =
    (data?.connectedErp || [])
      .map((source) => ERP_SOURCE_LABELS[source] || source)
      .join(" + ") || "—";

  const categoryName = ledger
    ? findCategoryNameForLedger(tree, ledger.id)
    : "—";

  const handleSync = async () => {
    if (!guardAction("accounting.coa.sync")) return;
    try {
      const result = await syncCoa().unwrap();
      toast.success(result?.message || "Chart of Accounts sync completed");
      refetch();
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Failed to sync Chart of Accounts"));
    }
  };

  const openCreateNode = (entityType = COA_TYPE.LEDGER) => {
    if (!guardAction("accounting.ledger.create")) return;
    setLedgerDrawer({ open: true, mode: "create", entityType, ledger: null });
  };

  const openEditNode = (node) => {
    if (!guardAction("accounting.ledger.edit")) return;
    if (!node) return;
    setLedgerDrawer({
      open: true,
      mode: "edit",
      entityType: node.type || COA_TYPE.LEDGER,
      ledger: {
        ...node,
        id: node?.id,
        category: node.type === COA_TYPE.LEDGER ? categoryName : node.category,
      },
    });
  };

  const closeLedgerDrawer = (open) => {
    setLedgerDrawer((prev) => ({ ...prev, open }));
  };

  const handleLedgerSubmit = async (payload) => {
    const isEditMode = ledgerDrawer.mode === "edit";
    const actionKey = isEditMode ? "accounting.ledger.edit" : "accounting.ledger.create";
    if (!guardAction(actionKey)) return;
    const entityType = payload.entityType || ledgerDrawer.entityType || COA_TYPE.LEDGER;

    try {
      let result;
      if (entityType === COA_TYPE.CATEGORY) {
        const body = {
          erpSource: payload.erpSource,
          name: payload.name,
          description: payload.description,
          active: payload.active,
          status: payload.status,
          notes: payload.notes,
        };
        result = isEditMode
          ? await updateCategory({ categoryId: ledgerDrawer.ledger?.id, body }).unwrap()
          : await createCategory(body).unwrap();
      } else if (entityType === COA_TYPE.GROUP) {
        const body = {
          erpSource: payload.erpSource,
          name: payload.name,
          description: payload.description,
          accountCategory: payload.accountCategory,
          parentId: payload.parentId,
          parentType: payload.parentType,
          active: payload.active,
          status: payload.status,
          notes: payload.notes,
        };
        result = isEditMode
          ? await updateGroup({ groupId: ledgerDrawer.ledger?.id, body }).unwrap()
          : await createGroup(body).unwrap();
      } else {
        result = isEditMode
          ? await updateLedger({
              ledgerId: ledgerDrawer.ledger?.id,
              body: {
                name: payload.name,
                code: payload.code,
                description: payload.description,
                parentId: payload.parentId,
                parentType: payload.parentType,
                active: payload.active,
                status: payload.status,
                notes: payload.notes,
              },
            }).unwrap()
          : await createLedger(payload).unwrap();
      }

      toast.success(
        result?.message ||
          (isEditMode
            ? "Account updated successfully and synchronized"
            : "Account created successfully and synchronized"),
      );
      setLedgerDrawer({
        open: false,
        mode: "create",
        entityType: COA_TYPE.LEDGER,
        ledger: null,
      });
      await refetch();
    } catch (err) {
      toast.error(
        getAccountingErrorMessage(
          err,
          isEditMode ? "Could not update account" : "Could not create account",
        ),
      );
    }
  };

  const selectedBranchNode =
    selectedNode && selectedNode.type !== COA_TYPE.LEDGER ? selectedNode : null;

  const childLedgers = (selectedNode?.children || []).filter((c) => c.type === COA_TYPE.LEDGER);
  const childGroups = (selectedNode?.children || []).filter((c) => c.type === COA_TYPE.GROUP);

  return (
    <div className="flex min-h-[70vh] flex-col" data-testid="accounting-page">
      <div className="border-b bg-card px-1 pb-4">
        <button
          type="button"
          onClick={() => navigate("/accounting")}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to Accounting
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Manrope'] text-primary">
              Chart of Accounts
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connected ERP: <span className="font-medium text-foreground">{connectedLabel}</span>
              {" · "}
              Last Sync:{" "}
              <span className="font-medium text-foreground">
                {formatDateTime(data?.lastSyncAt)}
              </span>
              {" · "}
              Total Accounts:{" "}
              <span className="font-medium text-foreground">{data?.totalAccounts ?? 0}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateLedger ? (
              <Button
                variant="outline"
                onClick={() => openCreateNode(COA_TYPE.CATEGORY)}
                data-testid="coa-create-category-btn"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            ) : null}
            {canCreateLedger ? (
              <Button
                variant="outline"
                onClick={() => openCreateNode(COA_TYPE.GROUP)}
                data-testid="coa-create-group-btn"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Button>
            ) : null}
            {canCreateLedger ? (
              <Button onClick={() => openCreateNode(COA_TYPE.LEDGER)} data-testid="coa-create-ledger-btn">
                <Plus className="mr-2 h-4 w-4" />
                Create Ledger
              </Button>
            ) : null}
            {canSync ? (
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing || isFetching}
                data-testid="coa-sync-now-btn"
              >
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {syncing ? "Syncing…" : "Sync Now"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="relative mt-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search category, group, ledger, code…"
            className="pl-9"
            data-testid="coa-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card className="mt-6 shadow-sm">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {getAccountingErrorMessage(error, "Failed to load Chart of Accounts.")}
            <div className="mt-4">
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : !tree.length ? (
        <Card className="mt-6 shadow-sm">
          <CardContent className="space-y-3 p-8 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">No Chart of Accounts data yet</p>
            <p>Sync the connected ERP or retry to load the latest Chart of Accounts.</p>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
              {canSync ? (
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sync Now
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-4 grid min-h-[58vh] gap-4 lg:grid-cols-[minmax(220px,30%)_1fr]">
          <Card className="overflow-hidden shadow-sm">
            <div className="max-h-[62vh] overflow-auto">
              <CoaTreePanel
                tree={filteredTree}
                selectedId={selectedNode?.id ?? null}
                onSelect={setSelectedNode}
                autoExpand={Boolean(search.trim())}
              />
            </div>
          </Card>

          <Card className="overflow-hidden shadow-sm">
            <div className="max-h-[62vh] space-y-5 overflow-auto p-5">
              {!selectedNode ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <BookOpen className="mb-3 h-10 w-10 opacity-40" strokeWidth={1.25} />
                  <p className="text-sm">Select a category, group, or ledger from the tree</p>
                </div>
              ) : null}

              {selectedNode && !ledger ? (
                <div>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {selectedNode.type}
                      </p>
                      <h2 className="text-xl font-semibold">{selectedNode.name}</h2>
                    </div>
                    {canEditLedger && selectedBranchNode ? (
                      <Button size="sm" variant="outline" onClick={() => openEditNode(selectedBranchNode)}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Ledgers</p>
                      <p className="mt-1 text-2xl font-bold">
                        {childLedgers.length || (selectedNode.children || []).length}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Sub-groups</p>
                      <p className="mt-1 text-2xl font-bold">{childGroups.length}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Select a ledger from the tree to view its details and usage.
                  </p>
                </div>
              ) : null}

              {ledger ? (
                <div className="space-y-5">
                  <div className="rounded-xl border p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Ledger
                        </p>
                        <h2 className="text-xl font-semibold">{detailLedger?.name || ledger.name}</h2>
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        {canEditLedger ? (
                          <Button size="sm" variant="outline" onClick={() => openEditNode({
                            ...detailLedger,
                            id: detailLedger?.id || ledger?.id,
                            type: COA_TYPE.LEDGER,
                          })}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        ) : null}
                        <Badge
                          variant="outline"
                          className={statusBadgeClass(
                            detailLedger?.status || ACCOUNT_STATUS.ACTIVE,
                          )}
                        >
                          {detailLedger?.status || ACCOUNT_STATUS.ACTIVE}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {[
                        ["Ledger Code", detailLedger?.code || ledger.code],
                        ["ERP", connectedLabel],
                        ["ERP ID", detailLedger?.erpId || ledger.erpId],
                        ["Category", categoryName],
                        ["Parent Group", detailLedger?.parentGroup || ledger.parentGroup],
                        ["Ledger Type", detailLedger?.ledgerType || ledger.ledgerType],
                        ["Status", detailLedger?.status || ACCOUNT_STATUS.ACTIVE],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="mt-0.5 text-sm font-medium">{value || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "Total Spend",
                        value: formatCurrencyCompact(detailLedger?.spend ?? ledger.spend),
                      },
                      { label: "Vendors", value: detailLedger?.vendors ?? ledger.vendors ?? 0 },
                      { label: "Invoices", value: detailLedger?.invoices ?? ledger.invoices ?? 0 },
                      {
                        label: "Line Items",
                        value: detailLedger?.lineItems ?? ledger.lineItems ?? 0,
                      },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg border bg-card p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {label}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-primary">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-hidden rounded-xl border">
                    <div className="border-b px-4 py-3">
                      <h3 className="text-sm font-semibold">Recent Transactions</h3>
                    </div>
                    {ledgerLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Invoice</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((tx, index) => (
                            <TableRow key={`${tx.invoice}-${index}`}>
                              <TableCell className="font-medium text-primary">
                                {tx.invoice}
                              </TableCell>
                              <TableCell>{tx.vendor}</TableCell>
                              <TableCell>{tx.item}</TableCell>
                              <TableCell>{tx.qty ?? "—"}</TableCell>
                              <TableCell className="font-semibold">
                                {formatCurrencyCompact(tx.amount)}
                              </TableCell>
                              <TableCell>{formatDate(tx.date)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={statusBadgeClass(tx.status)}>
                                  {tx.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {transactions.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="text-center text-muted-foreground"
                              >
                                No transactions for this ledger.
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      )}
      <LedgerFormDrawer
        open={ledgerDrawer.open}
        mode={ledgerDrawer.mode}
        entityType={ledgerDrawer.entityType}
        tree={tree}
        connectedErp={data?.connectedErp || []}
        ledger={ledgerDrawer.ledger}
        submitting={
          creatingCategory ||
          updatingCategory ||
          creatingGroup ||
          updatingGroup ||
          creatingLedger ||
          updatingLedger
        }
        onOpenChange={closeLedgerDrawer}
        onSubmit={handleLedgerSubmit}
      />
    </div>
  );
};

export default ChartOfAccounts;
