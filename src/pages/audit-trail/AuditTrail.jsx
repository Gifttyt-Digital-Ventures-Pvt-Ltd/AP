import React, { memo, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Bot,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AUDIT_ACTIONS,
  AUDIT_STATUSES,
  useExportAuditLogsMutation,
  useGetAuditLogsQuery,
  useGetAuditUsersQuery,
} from "../../Services/apis/auditTrailApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import AppDataTable from "../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";

const PAGE_SIZE = 25;

// Future use: when live audit updates are enabled again, normalize the stream URL
// because some deployments set VITE_BACKEND_URL with a trailing /api prefix.
// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";
// const buildApiUrl = (path) => {
//   const normalizedBase = String(BACKEND_URL || "").replace(/\/+$/, "");
//   if (!normalizedBase) return `/api${path}`;
//   return normalizedBase.endsWith("/api")
//     ? `${normalizedBase}${path}`
//     : `${normalizedBase}/api${path}`;
// };

const tableHeader = [
  { key: "timestamp", title: "Timestamp", headerClassName: "w-[180px]", cellClassName: "w-[180px]" },
  { key: "userName", title: "User Name", headerClassName: "w-[180px]", cellClassName: "w-[180px]" },
  { key: "action", title: "Action", headerClassName: "w-[200px]", cellClassName: "w-[200px]" },
  { key: "details", title: "Details", cellClassName: "max-w-[420px]" },
  { key: "status", title: "Status", headerClassName: "w-[120px]", cellClassName: "w-[120px]" },
];

const titleCase = (value = "") =>
  String(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const defaultFromDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return toLocalDateInput(date);
};

const toIsoStart = (dateValue) => (dateValue ? `${dateValue}T00:00:00` : "");
const toIsoEnd = (dateValue) => (dateValue ? `${dateValue}T23:59:59` : "");

const parseMulti = (searchParams, key) =>
  searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

const useDebouncedValue = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debouncedValue;
};

const getActionBadgeClass = (action = "") => {
  if (action.startsWith("VENDOR")) return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  if (action.startsWith("INVOICE") || action.startsWith("PO")) {
    return "bg-purple-100 text-purple-800 hover:bg-purple-100";
  }
  if (action.startsWith("PAYMENT")) return "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  if (action.startsWith("USER") || action.startsWith("ROLE")) {
    return "bg-amber-100 text-amber-800 hover:bg-amber-100";
  }
  return "bg-slate-100 text-slate-800 hover:bg-slate-100";
};

const getStatusBadgeClass = (status = "") => {
  if (["SUCCESS", "COMPLETED", "APPROVED"].includes(status)) {
    return "bg-green-100 text-green-800 hover:bg-green-100";
  }
  if (status === "PENDING") return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
  if (["REJECTED", "FAILED"].includes(status)) return "bg-red-100 text-red-800 hover:bg-red-100";
  return "bg-muted text-muted-foreground hover:bg-muted";
};

const formatTimestamp = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

const getUtcTitle = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `UTC: ${date.toISOString()}`;
};

const getFilename = (format, contentDisposition = "") => {
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (match?.[1]) return match[1];

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `audit-trail_${stamp}.${format}`;
};

const getFilenameFromDownloadUrl = (downloadUrl, format) => {
  try {
    const pathname = new URL(downloadUrl).pathname;
    const name = pathname.split("/").pop();
    if (name) return decodeURIComponent(name);
  } catch {
    // fall through to generated filename
  }
  return getFilename(format);
};

// Future use: client-side filter for SSE payloads before inserting live rows.
// const matchesFilters = (entry, filters) => {
//   if (!entry) return false;
//   const search = String(filters.search || "").trim().toLowerCase();
//   if (search) {
//     const haystack = `${entry.userName || ""} ${entry.details || ""}`.toLowerCase();
//     if (!haystack.includes(search)) return false;
//   }
//   if (filters.userId?.length > 0) {
//     const entryUserId = String(entry.userId || "");
//     const entryUserName = String(entry.userName || "");
//     const matchesUserId = entryUserId && filters.userId.includes(entryUserId);
//     const matchesUserName = filters.userNames?.includes(entryUserName);
//     if (!matchesUserId && !matchesUserName) return false;
//   }
//   if (filters.action?.length > 0 && !filters.action.includes(entry.action)) return false;
//   if (filters.status?.length > 0 && !filters.status.includes(entry.status)) return false;
//   if (filters.from && new Date(entry.timestamp) < new Date(filters.from)) return false;
//   if (filters.to && new Date(entry.timestamp) > new Date(filters.to)) return false;
//   return true;
// };

const MultiSelectFilter = ({ label, values, options, selected, onChange }) => {
  const selectedCount = selected.length;
  const selectedText = selectedCount === 0 ? "All" : `${selectedCount} selected`;

  const toggleValue = (value) => {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className="justify-between gap-2">
          {label}: {selectedText}
          <Filter className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const value = values ? option[values.value] : option;
          const optionLabel = values ? option[values.label] : titleCase(option);
          return (
            <DropdownMenuCheckboxItem
              key={value}
              checked={selected.includes(String(value))}
              onCheckedChange={() => toggleValue(String(value))}
              onSelect={(event) => event.preventDefault()}
            >
              {optionLabel}
            </DropdownMenuCheckboxItem>
          );
        })}
        {selectedCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange([])}>Clear {label}</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AuditBadge = ({ type, value }) => (
  <Badge
    aria-label={`${type} ${titleCase(value)}`}
    className={type === "Action" ? getActionBadgeClass(value) : getStatusBadgeClass(value)}
  >
    {titleCase(value)}
  </Badge>
);

const AuditRow = memo(({ entry, highlighted }) => (
  <TableRow className={highlighted ? "bg-yellow-50 transition-colors" : undefined}>
    <TableCell className="w-[180px]" title={getUtcTitle(entry.timestamp)}>
      {formatTimestamp(entry.timestamp)}
    </TableCell>
    <TableCell className="w-[180px]">
      {entry.userName === "SYSTEM" ? (
        <span className="inline-flex items-center gap-1 italic">
          <Bot className="h-4 w-4 text-muted-foreground" />
          SYSTEM
        </span>
      ) : (
        entry.userName || "-"
      )}
    </TableCell>
    <TableCell className="w-[200px]">
      <AuditBadge type="Action" value={entry.action} />
    </TableCell>
    <TableCell className="max-w-[420px]">
      <span className="block truncate" title={entry.details || "-"}>
        {entry.details || "-"}
      </span>
    </TableCell>
    <TableCell className="w-[120px]">
      <AuditBadge type="Status" value={entry.status} />
    </TableCell>
  </TableRow>
));
AuditRow.displayName = "AuditRow";

const AuditCard = ({ entry, highlighted }) => (
  <div className={`rounded-lg border border-border bg-card p-4 shadow-sm ${highlighted ? "bg-yellow-50" : ""}`}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <p className="text-xs text-muted-foreground">Timestamp</p>
        <p className="text-sm font-medium" title={getUtcTitle(entry.timestamp)}>
          {formatTimestamp(entry.timestamp)}
        </p>
      </div>
      <AuditBadge type="Status" value={entry.status} />
    </div>
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground">User Name</p>
        <p className={entry.userName === "SYSTEM" ? "text-sm italic" : "text-sm"}>
          {entry.userName || "-"}
        </p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Action</p>
        <div className="mt-1">
          <AuditBadge type="Action" value={entry.action} />
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Details</p>
        <p className="text-sm" title={entry.details || "-"}>
          {entry.details || "-"}
        </p>
      </div>
    </div>
  </div>
);

const AuditTrail = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamString = searchParams.toString();
  const initialSearch = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const queryState = useMemo(() => {
    const params = new URLSearchParams(searchParamString);
    return {
      page: Number(params.get("page") || 0),
      fromDate: params.get("fromDate") || defaultFromDate(),
      toDate: params.get("toDate") || toLocalDateInput(new Date()),
      search: params.get("search") || "",
      userId: parseMulti(params, "userId"),
      action: parseMulti(params, "action"),
      status: parseMulti(params, "status"),
    };
  }, [searchParamString]);
  const { page, fromDate, toDate, userId, action, status } = queryState;
  const [liveRows, setLiveRows] = useState([]);
  const [highlightedIds] = useState(new Set());
  const [newEntriesCount, setNewEntriesCount] = useState(0);
  const [liveState] = useState("disabled");
  const [exportAuditLogs, { isLoading: exportingAuditLogs }] = useExportAuditLogsMutation();
  const [exportingFormat, setExportingFormat] = useState(null);

  useEffect(() => {
    if (debouncedSearch === (searchParams.get("search") || "")) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set("search", debouncedSearch);
    else next.delete("search");
    next.set("page", "0");
    setSearchParams(next, { replace: true });
  }, [debouncedSearch, searchParams, setSearchParams]);

  const filters = useMemo(
    () => ({
      page,
      size: PAGE_SIZE,
      sort: "timestamp,desc",
      search: queryState.search,
      from: toIsoStart(fromDate),
      to: toIsoEnd(toDate),
      userId,
      action,
      status,
    }),
    [action, fromDate, page, queryState.search, status, toDate, userId],
  );

  const {
    data: logsPage,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetAuditLogsQuery(filters);
  const {
    data: auditUsers = [],
    isError: usersError,
    refetch: refetchUsers,
  } = useGetAuditUsersQuery();
  // Future use: include selected user display names in stream filters because
  // stream payloads may only include userName while filters send userId.
  // const selectedUserNames = useMemo(() => {
  //   const selectedIds = new Set(userId);
  //   return auditUsers
  //     .filter((user) => selectedIds.has(String(user.userId)))
  //     .map((user) => user.userName);
  // }, [auditUsers, userId]);
  // const streamFilters = useMemo(
  //   () => ({ ...filters, userNames: selectedUserNames }),
  //   [filters, selectedUserNames],
  // );

  const totalElements = logsPage?.totalElements ?? 0;
  const totalPages = logsPage?.totalPages ?? 1;
  const forbidden = error?.status === 403;
  const visibleRows = useMemo(() => {
    const logs = logsPage?.content || [];
    const seen = new Set();
    return [...liveRows, ...logs].filter((entry) => {
      if (!entry?.id || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }, [liveRows, logsPage?.content]);

  const setParamValues = (key, values) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    values.forEach((value) => next.append(key, value));
    next.set("page", "0");
    setSearchParams(next);
  };

  const setDateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    next.set("page", "0");
    setSearchParams(next);
  };

  const clearFilters = () => {
    setSearchInput("");
    setLiveRows([]);
    setNewEntriesCount(0);
    setSearchParams({
      page: "0",
      fromDate: defaultFromDate(),
      toDate: toLocalDateInput(new Date()),
    });
  };

  const goToPage = (nextPage) => {
    const boundedPage = Math.max(0, Math.min(nextPage, Math.max(totalPages - 1, 0)));
    const next = new URLSearchParams(searchParams);
    next.set("page", String(boundedPage));
    setSearchParams(next);
  };

  const handleExport = async (format) => {
    if (totalElements > 50000 && !window.confirm("Export may take time. Proceed?")) return;
    setExportingFormat(format);
    try {
      const { downloadUrl } = await exportAuditLogs({
        ...filters,
        page: undefined,
        size: undefined,
        sort: undefined,
        format,
        confirm: totalElements > 100000 ? true : undefined,
      }).unwrap();

      if (!downloadUrl) {
        toast.error("Export failed: no download link returned.");
        return;
      }

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = getFilenameFromDownloadUrl(downloadUrl, format);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Audit logs exported");
    } catch (exportError) {
      toast.error(
        exportError?.data?.detail ||
          exportError?.data?.message ||
          exportError?.error ||
          exportError?.message ||
          "Export failed. Retry?",
      );
    } finally {
      setExportingFormat(null);
    }
  };

  useEffect(() => {
    if (usersError) toast.error("Failed to load audit users");
  }, [usersError]);

  useEffect(() => {
    setLiveRows([]);
    setNewEntriesCount(0);
  }, [filters.search, filters.from, filters.to, filters.userId, filters.action, filters.status]);

  // Future use: enable this effect when continuous live audit updates are needed.
  // Keeping it disabled avoids a long-lived SSE request on every Audit Trail visit.
  //
  // useEffect(() => {
  //   const token = sessionStorage.getItem("token");
  //   if (!token || typeof ReadableStream === "undefined") {
  //     setLiveState("polling");
  //     return undefined;
  //   }
  //
  //   const abortController = new AbortController();
  //   streamAbortRef.current = abortController;
  //   let cancelled = false;
  //
  //   const connect = async () => {
  //     try {
  //       setLiveState("connecting");
  //       const response = await fetch(buildApiUrl("/v1/audit-logs/stream"), {
  //         method: "GET",
  //         headers: {
  //           Accept: "text/event-stream",
  //           Authorization: `Bearer ${token}`,
  //           authToken: token,
  //         },
  //         signal: abortController.signal,
  //       });
  //
  //       if (response.status === 429) {
  //         throw new Error("Too many live stream connections");
  //       }
  //
  //       if (!response.ok || !response.body) throw new Error("Stream unavailable");
  //
  //       setLiveState("live");
  //       const reader = response.body.getReader();
  //       const decoder = new TextDecoder();
  //       let buffer = "";
  //
  //       while (!cancelled) {
  //         const { value, done } = await reader.read();
  //         if (done) break;
  //         buffer += decoder.decode(value, { stream: true });
  //         const messages = buffer.split("\n\n");
  //         buffer = messages.pop() || "";
  //
  //         messages.forEach((message) => {
  //           const data = message
  //             .split("\n")
  //             .filter((line) => line.startsWith("data:"))
  //             .map((line) => line.replace(/^data:\s?/, ""))
  //             .join("\n");
  //           if (!data) return;
  //
  //           try {
  //             const entry = JSON.parse(data);
  //             if (!matchesFilters(entry, streamFilters)) return;
  //
  //             if (streamFilters.page === 0) {
  //               window.requestAnimationFrame(() => {
  //                 setLiveRows((currentRows) => [entry, ...currentRows].slice(0, PAGE_SIZE));
  //                 setHighlightedIds((currentIds) => new Set([...currentIds, entry.id]));
  //                 window.setTimeout(() => {
  //                   setHighlightedIds((currentIds) => {
  //                     const nextIds = new Set(currentIds);
  //                     nextIds.delete(entry.id);
  //                     return nextIds;
  //                   });
  //                 }, 2000);
  //               });
  //             } else {
  //               setNewEntriesCount((count) => count + 1);
  //             }
  //           } catch {
  //             // Ignore malformed SSE payloads.
  //           }
  //         });
  //       }
  //
  //       if (!cancelled) setLiveState("polling");
  //     } catch {
  //       if (!cancelled) setLiveState("polling");
  //     }
  //   };
  //
  //   connect();
  //
  //   return () => {
  //     cancelled = true;
  //     abortController.abort();
  //   };
  // }, [streamFilters]);

  const renderAuditRow = (entry) => (
    <AuditRow key={entry.id} entry={entry} highlighted={highlightedIds.has(entry.id)} />
  );

  const startRecord = totalElements === 0 ? 0 : page * PAGE_SIZE + 1;
  const endRecord = Math.min((page + 1) * PAGE_SIZE, totalElements);
  const invalidDateRange = new Date(toDate) < new Date(fromDate);

  return (
    <div className="space-y-6" data-testid="audit-trail-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="font-['Manrope'] text-4xl font-bold text-primary md:text-5xl">
            Audit Trail
          </h1>
          <p className="mt-2 text-muted-foreground">
            Search, filter, and export Accounts Payable activity logs.
          </p>
        </div>
        {!forbidden && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" className="gap-2">
                {exportingAuditLogs || exportingFormat ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("csv")}>CSV (.csv)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>PDF (.pdf)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1.2fr)_repeat(2,minmax(160px,0.65fr))_auto_auto_auto]">
          <div className="relative">
            <Label htmlFor="audit-search" className="sr-only">Search audit logs</Label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="audit-search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search user or details..."
              className="pl-9"
            />
          </div>
          <div>
            <Label htmlFor="audit-from" className="sr-only">From date</Label>
            <Input
              id="audit-from"
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(event) => setDateParam("fromDate", event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="audit-to" className="sr-only">To date</Label>
            <Input
              id="audit-to"
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(event) => setDateParam("toDate", event.target.value)}
            />
          </div>
          <MultiSelectFilter
            label="User"
            options={auditUsers}
            values={{ value: "userId", label: "userName" }}
            selected={userId}
            onChange={(values) => setParamValues("userId", values)}
          />
          <MultiSelectFilter
            label="Action"
            options={AUDIT_ACTIONS}
            selected={action}
            onChange={(values) => setParamValues("action", values)}
          />
          <MultiSelectFilter
            label="Status"
            options={AUDIT_STATUSES}
            selected={status}
            onChange={(values) => setParamValues("status", values)}
          />
        </div>
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {/* <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                liveState === "live"
                  ? "bg-green-100 text-green-800"
                  : liveState === "disabled"
                    ? "bg-muted text-muted-foreground"
                    : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {liveState === "live" ? (
                <>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
                  Live
                </>
              ) : liveState === "disabled" ? (
                "Live updates off"
              ) : (
                <>
                  Real-time updates paused
                </>
              )}
            </span> */}
            {isFetching && !isLoading && <span>Refreshing...</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
            <Button type="button" variant="outline" onClick={() => { refetch(); refetchUsers(); }} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
        {invalidDateRange && (
          <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            Date range is invalid. The end date cannot be before the start date.
          </div>
        )}
      </div>

      {newEntriesCount > 0 && (
        <button
          type="button"
          onClick={() => {
            setNewEntriesCount(0);
            goToPage(0);
            refetch();
          }}
          className="sticky top-2 z-20 w-full rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-900 shadow-sm"
        >
          {newEntriesCount} new entr{newEntriesCount === 1 ? "y" : "ies"} - click to view
        </button>
      )}

      {isError && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {forbidden
              ? "You do not have permission to view audit logs."
              : "Failed to load audit logs."}
          </span>
          {!forbidden && (
            <Button type="button" variant="outline" size="sm" onClick={refetch}>
              Retry
            </Button>
          )}
        </div>
      )}

      {!forbidden && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-6">
          <div className="hidden md:block">
            <AppDataTable
              tableHeader={tableHeader}
              tableData={visibleRows}
              renderRow={renderAuditRow}
              isLoading={isLoading}
              loadingRowCount={8}
              emptyMessage="No audit records match your filters"
              emptyColSpan={tableHeader.length}
            />
          </div>

          <div className="space-y-3 md:hidden">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-44 animate-pulse rounded-lg bg-muted" />
              ))
            ) : visibleRows.length > 0 ? (
              visibleRows.map((entry) => (
                <AuditCard
                  key={entry.id}
                  entry={entry}
                  highlighted={highlightedIds.has(entry.id)}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No audit records match your filters
                </p>
                <Button type="button" variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startRecord}-{endRecord} of {totalElements.toLocaleString("en-IN")}
            </p>
            <Pagination className="mx-0 justify-start md:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page - 1);
                    }}
                    className={page === 0 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                  const pageNumber = totalPages <= 5 ? index : Math.min(Math.max(page - 2, 0) + index, totalPages - 1);
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === page}
                        onClick={(event) => {
                          event.preventDefault();
                          goToPage(pageNumber);
                        }}
                      >
                        {pageNumber + 1}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {totalPages > 5 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      goToPage(page + 1);
                    }}
                    className={page + 1 >= totalPages ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
