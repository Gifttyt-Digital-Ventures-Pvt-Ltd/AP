import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  Eye,
  Loader2,
  Lock,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  useGetSyncDataCategoriesQuery,
  useGetSyncDataItemsQuery,
  useImportSyncDataItemsMutation,
} from "../../../Services/apis/integrationsApi";
import { useActionGuard } from "../../../hooks/useActionGuard";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Checkbox } from "../../../components/ui/checkbox";
import { Input } from "../../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  getIntegrationProviderPathValue,
  isGranularSyncSupported,
  SYNC_DATA_LIMIT,
  SYNC_DATA_STATUS,
} from "../syncDataUtils";
import { getErrorText, titleize } from "../utils";
import { EmptyState, LoadingState, PageShell, StatusBadge } from "./shared";

const STATUS_LABELS = {
  [SYNC_DATA_STATUS.NOT_IMPORTED]: "Not imported",
  [SYNC_DATA_STATUS.PARTIALLY_IMPORTED]: "Partially imported",
  [SYNC_DATA_STATUS.FULLY_IMPORTED]: "Fully imported",
  [SYNC_DATA_STATUS.UNAVAILABLE]: "Unavailable",
};

const statusClassName = (status) => {
  if (status === SYNC_DATA_STATUS.FULLY_IMPORTED) {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (status === SYNC_DATA_STATUS.PARTIALLY_IMPORTED) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === SYNC_DATA_STATUS.UNAVAILABLE) {
    return "border-slate-200 bg-slate-50 text-slate-600";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const getUnsyncedCount = (category = {}) =>
  Math.max(Number(category.totalAvailable || 0) - Number(category.syncedCount || 0), 0);

const ImportResultSummary = ({ result }) => {
  if (!result) return null;

  const failures = result.results.filter((item) => item.status === "FAILED");
  const successes = result.results.filter((item) => item.status !== "FAILED");

  return (
    <Card className="rounded-md border-blue-100 bg-blue-50/50">
      <CardContent className="space-y-2 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-green-200 bg-white text-green-700">
            {result.successCount || successes.length} imported
          </Badge>
          <Badge variant="outline" className="border-red-200 bg-white text-red-700">
            {result.failureCount || failures.length} failed
          </Badge>
        </div>
        {failures.length > 0 && (
          <div className="space-y-1 text-xs text-red-700">
            {failures.slice(0, 3).map((failure) => (
              <p key={failure.sourceItemId}>
                {failure.sourceItemId}: {failure.message || "Import failed"}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SyncCategoryChecklist = ({
  categories,
  canEdit,
  onEdit,
  onViewImported,
}) => {
  if (categories.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="No sync data categories"
        description="The backend did not return any granular sync categories for this connection."
      />
    );
  }

  return (
    <Card className="rounded-md">
      <CardHeader>
        <CardTitle className="text-base">Sync Data Checklist</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Imported</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const unsupported =
                !category.supported || category.status === SYNC_DATA_STATUS.UNAVAILABLE;
              const fullyImported =
                category.status === SYNC_DATA_STATUS.FULLY_IMPORTED && getUnsyncedCount(category) === 0;
              const canOpenEdit = canEdit && !unsupported && !fullyImported;
              const canViewImported = !unsupported && category.syncedCount > 0;

              return (
                <TableRow key={category.code}>
                  <TableCell>
                    <div className="font-medium">{category.label}</div>
                    <div className="text-xs text-muted-foreground">{category.code}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClassName(category.status)}>
                      {STATUS_LABELS[category.status] || titleize(category.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{category.syncedCount}</span>
                    <span className="text-muted-foreground"> of {category.totalAvailable}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canViewImported && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onViewImported(category)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View imported
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        disabled={!canOpenEdit}
                        onClick={() => onEdit(category)}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const SyncItemPicker = ({
  provider,
  connectionId,
  category,
  importedOnly = false,
  canEdit,
  canImport,
  onBack,
  onImported,
}) => {
  const { guardAction } = useActionGuard();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [offset, setOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [importResult, setImportResult] = useState(null);
  const [importItems, { isLoading: importing }] = useImportSyncDataItemsMutation();

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch]);

  useEffect(() => {
    setSelectedIds(new Set());
    setImportResult(null);
  }, [connectionId, category?.code, importedOnly]);

  const queryArgs = {
    provider,
    connectionId,
    categoryCode: category?.code,
    search: debouncedSearch,
    limit: SYNC_DATA_LIMIT,
    offset,
    importedOnly,
  };

  const {
    data,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetSyncDataItemsQuery(queryArgs, {
    skip: !provider || !connectionId || !category?.code,
  });

  const items = data?.items || [];
  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.has(item.sourceItemId)),
    [items, selectedIds],
  );

  const toggleItem = (item) => {
    if (importedOnly || item.alreadySynced || !canEdit) return;
    if (!guardAction("integrations.mapping.edit", "You do not have permission to select ERP data")) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.sourceItemId)) next.delete(item.sourceItemId);
      else next.add(item.sourceItemId);
      return next;
    });
  };

  const handleImport = async () => {
    if (!guardAction("integrations.sync.trigger", "You do not have permission to import ERP data")) return;
    const itemIds = Array.from(selectedIds);
    if (itemIds.length === 0) return;

    try {
      const response = await importItems({
        provider,
        connectionId,
        categoryCode: category.code,
        itemIds,
      }).unwrap();
      setImportResult(response);
      setSelectedIds(new Set());
      toast.success("Import data request completed");
      refetch();
      onImported?.();
    } catch (importError) {
      toast.error(getErrorText(importError, "Failed to import selected ERP data"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to checklist
        </Button>
        <Badge variant="outline" className="border-slate-200 bg-slate-50">
          {importedOnly ? "Imported items only" : "Select new items"}
        </Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              {category.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ERP items"
                className="pl-9"
              />
            </div>

            {isFetching && !data ? (
              <LoadingState label="Loading ERP items..." />
            ) : isError ? (
              <EmptyState
                icon={RefreshCw}
                title="Could not load ERP items"
                description={getErrorText(error, "Retry the request or confirm backend support for this category.")}
                action={
                  <Button type="button" variant="outline" onClick={refetch}>
                    Retry
                  </Button>
                }
              />
            ) : items.length === 0 ? (
              <EmptyState
                icon={Database}
                title="No ERP items found"
                description={importedOnly ? "No imported items were returned for this category." : "Try a different search term or category."}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {!importedOnly && <TableHead className="w-10">Select</TableHead>}
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const checked = item.alreadySynced || selectedIds.has(item.sourceItemId);
                    return (
                      <TableRow key={item.sourceItemId}>
                        {!importedOnly && (
                          <TableCell>
                            <Checkbox
                              checked={checked}
                              disabled={item.alreadySynced || !canEdit}
                              onCheckedChange={() => toggleItem(item)}
                              aria-label={`Select ${item.name}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.sourceItemId}</div>
                        </TableCell>
                        <TableCell>{item.code || "-"}</TableCell>
                        <TableCell>
                          {item.alreadySynced ? (
                            <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                              <Lock className="mr-1 h-3 w-3" />
                              Imported
                            </Badge>
                          ) : (
                            <Badge variant="outline">Available</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Showing {data?.offset ?? offset} - {(data?.offset ?? offset) + items.length} of {data?.total ?? 0}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={offset === 0 || isFetching}
                  onClick={() => setOffset((current) => Math.max(current - SYNC_DATA_LIMIT, 0))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!data?.hasMore || isFetching}
                  onClick={() => setOffset((current) => current + SYNC_DATA_LIMIT)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Selections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {importedOnly ? (
              <p className="text-sm text-muted-foreground">
                Imported items are read-only. Unsync and removal are not available.
              </p>
            ) : (
              <>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-2xl font-semibold">{selectedIds.size}</p>
                  <p className="text-xs text-muted-foreground">newly selected items</p>
                </div>
                {selectedIds.size === 0 ? (
                  <p className="text-sm text-muted-foreground">Select items from the left table.</p>
                ) : (
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.sourceItemId} className="rounded-md border p-2 text-sm">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.code || item.sourceItemId}</p>
                      </div>
                    ))}
                    {selectedIds.size > selectedItems.length && (
                      <p className="text-xs text-muted-foreground">
                        {selectedIds.size - selectedItems.length} selected item(s) from another page.
                      </p>
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  className="w-full"
                  disabled={selectedIds.size === 0 || !canImport || importing}
                  onClick={handleImport}
                >
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Import Data
                </Button>
              </>
            )}
            <ImportResultSummary result={importResult} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ManageSyncedData = ({
  mode = "connection",
  connectionId,
  provider,
  categoryCode,
  embedded = false,
  onDone,
}) => {
  const navigate = useNavigate();
  const { canPerformAction, guardAction } = useActionGuard();
  const providerPath = getIntegrationProviderPathValue(provider);
  const [activeCategoryCode, setActiveCategoryCode] = useState(categoryCode || "");
  const [importedOnly, setImportedOnly] = useState(false);

  useEffect(() => {
    setActiveCategoryCode(categoryCode || "");
    setImportedOnly(false);
  }, [categoryCode, connectionId]);

  const {
    data: summary,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetSyncDataCategoriesQuery(
    { provider, connectionId },
    { skip: !providerPath || !connectionId },
  );

  const categories = summary?.categories || [];
  const granularSupported = isGranularSyncSupported(summary);
  const activeCategory = categories.find((category) => category.code === activeCategoryCode);
  const canEdit = canPerformAction("integrations.mapping.edit");
  const canImport = canPerformAction("integrations.sync.trigger");

  const openCategory = (category) => {
    if (!guardAction("integrations.mapping.edit", "You do not have permission to edit ERP sync data")) return;
    setImportedOnly(false);
    setActiveCategoryCode(category.code);
  };

  const viewImported = (category) => {
    setImportedOnly(true);
    setActiveCategoryCode(category.code);
  };

  const handleBack = () => {
    setActiveCategoryCode("");
    setImportedOnly(false);
    if (!embedded && categoryCode) {
      navigate(`/integrations/${connectionId}/sync-data`);
    }
  };

  const content = (() => {
    if (!providerPath) {
      return (
        <EmptyState
          icon={Database}
          title="Granular sync unavailable"
          description="This connection provider is not supported for granular sync data selection."
        />
      );
    }

    if (!connectionId) {
      return (
        <EmptyState
          icon={Database}
          title="Connection missing"
          description="Open this screen from a valid ERP connection."
        />
      );
    }

    if (isFetching && !summary) return <LoadingState label="Checking granular sync support..." />;

    if (isError) {
      return (
        <EmptyState
          icon={RefreshCw}
          title="Granular sync is unavailable"
          description={getErrorText(error, "The backend did not return granular sync category support for this connection.")}
          action={
            <Button type="button" variant="outline" onClick={refetch}>
              Retry
            </Button>
          }
        />
      );
    }

    if (!granularSupported) {
      return (
        <EmptyState
          icon={Database}
          title="Granular sync not enabled"
          description="This provider has not enabled granular sync data selection. Existing broad sync remains available."
        />
      );
    }

    if (activeCategoryCode) {
      if (!activeCategory) {
        return (
          <EmptyState
            icon={Database}
            title="Category not found"
            description="The selected sync data category was not returned by the backend."
            action={
              <Button type="button" variant="outline" onClick={handleBack}>
                Back to checklist
              </Button>
            }
          />
        );
      }

      return (
        <SyncItemPicker
          provider={provider}
          connectionId={connectionId}
          category={activeCategory}
          importedOnly={importedOnly}
          canEdit={canEdit}
          canImport={canImport}
          onBack={handleBack}
          onImported={refetch}
        />
      );
    }

    return (
      <div className="space-y-4">
        <SyncCategoryChecklist
          categories={categories}
          canEdit={canEdit}
          onEdit={openCategory}
          onViewImported={viewImported}
        />
        {mode === "wizard" && (
          <div className="flex justify-end">
            <Button type="button" onClick={onDone}>
              Continue to dashboard
            </Button>
          </div>
        )}
      </div>
    );
  })();

  if (embedded) return content;

  return (
    <PageShell
      title="Manage Synced Data"
      description="Import selected ERP master data by category without resending already imported items."
      backAction={
        <Button asChild variant="outline" size="sm">
          <Link to={connectionId ? `/integrations/${connectionId}` : "/integrations"}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      }
      actions={summary?.provider ? <StatusBadge status={summary.provider} /> : null}
    >
      {content}
    </PageShell>
  );
};

export default ManageSyncedData;
