import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { X, ChevronsUpDown, Check } from "lucide-react";
import { Input } from "../ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import { cn } from "../../lib/utils";
import { useGetVendorsQuery } from "../../Services/apis/invoicesVendorsApi";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const PAGE_SIZE = 20;

/**
 * ConnectedVendorMultiPicker
 *
 * Multi-select vendor picker that fetches vendors on-demand via paginated search.
 * Does NOT require a pre-fetched vendor list — replaces the full useGetVendorsQuery
 * approach in workflow rule forms.
 *
 * Props:
 *  selectedIds   string[]              Array of selected vendor IDs
 *  selectedNames string[]              Parallel array of vendor names (for display)
 *  onChange      (ids, names) => void  Called when selection changes
 *  disabled      boolean
 *  placeholder   string
 */
export const ConnectedVendorMultiPicker = ({
  selectedIds = [],
  selectedNames = [],
  onChange,
  disabled = false,
  placeholder = "Search and select vendors…",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const [offset, setOffset] = useState(0);
  const [accumulatedVendors, setAccumulatedVendors] = useState([]);

  // Reset list when search changes
  useEffect(() => {
    setOffset(0);
    setAccumulatedVendors([]);
  }, [debouncedQuery]);

  const { data: vendorsData = [], isFetching } = useGetVendorsQuery({
    limit: PAGE_SIZE,
    offset,
    ...(debouncedQuery ? { search: debouncedQuery } : {}),
  });

  const currentPageVendors = Array.isArray(vendorsData)
    ? vendorsData
    : Array.isArray(vendorsData?.data)
    ? vendorsData.data
    : Array.isArray(vendorsData?.vendors)
    ? vendorsData.vendors
    : [];

  // Accumulate pages
  useEffect(() => {
    if (currentPageVendors.length === 0) return;
    setAccumulatedVendors((prev) => {
      if (offset === 0) return currentPageVendors;
      const existingIds = new Set(prev.map((v) => v.id));
      const fresh = currentPageVendors.filter((v) => !existingIds.has(v.id));
      return [...prev, ...fresh];
    });
  }, [currentPageVendors, offset]);

  const vendorOptions = offset === 0 && accumulatedVendors.length === 0
    ? currentPageVendors
    : accumulatedVendors;

  const totalVendors = Number(vendorsData?.total ?? vendorOptions.length);
  const hasMore = Boolean(vendorsData?.hasMore ?? vendorOptions.length < totalVendors);

  const lastLoadCountRef = useRef(0);
  const anchorRef = useRef(null);
  const triggerRef = useRef(null);

  const handleLoadMore = useCallback((element) => {
    if (!hasMore || isFetching) return;
    if (!element) return;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const scrollableDistance = Math.max(scrollHeight - clientHeight, 0);
    if (scrollableDistance === 0) return;
    const remainingDistance = scrollHeight - scrollTop - clientHeight;
    if (remainingDistance > scrollableDistance * 0.2) return;
    if (lastLoadCountRef.current === vendorOptions.length) return;
    lastLoadCountRef.current = vendorOptions.length;
    setOffset((p) => p + PAGE_SIZE);
  }, [hasMore, isFetching, vendorOptions.length]);

  useEffect(() => {
    if (!isFetching) lastLoadCountRef.current = 0;
  }, [vendorOptions.length, isFetching]);

  // Build a name lookup from options in the dropdown + already-selected names
  const nameLookup = useMemo(() => {
    const map = {};
    selectedIds.forEach((id, i) => {
      map[String(id)] = selectedNames[i] || id;
    });
    vendorOptions.forEach((v) => {
      map[String(v.id)] = v.name || v.vendor_name || String(v.id);
    });
    return map;
  }, [vendorOptions, selectedIds, selectedNames]);

  const selectedIdSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const toggleVendor = (vendor) => {
    const idStr = String(vendor.id);
    const nameStr = vendor.name || vendor.vendor_name || idStr;

    let nextIds, nextNames;
    if (selectedIdSet.has(idStr)) {
      const idx = selectedIds.findIndex((id) => String(id) === idStr);
      nextIds = selectedIds.filter((_, i) => i !== idx);
      nextNames = selectedNames.filter((_, i) => i !== idx);
    } else {
      nextIds = [...selectedIds, idStr];
      nextNames = [...selectedNames, nameStr];
    }
    onChange(nextIds, nextNames);
  };

  const removeVendor = (id) => {
    const idStr = String(id);
    const idx = selectedIds.findIndex((v) => String(v) === idStr);
    if (idx === -1) return;
    onChange(
      selectedIds.filter((_, i) => i !== idx),
      selectedNames.filter((_, i) => i !== idx),
    );
  };

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {nameLookup[String(id)] || id}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeVendor(id)}
                  className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"
                  aria-label={`Remove ${nameLookup[String(id)] || id}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search + dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="truncate">
              {selectedIds.length > 0
                ? `${selectedIds.length} vendor${selectedIds.length > 1 ? "s" : ""} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
          </button>
        </PopoverAnchor>

        <PopoverContent
          className="z-[120] w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (
              anchorRef.current?.contains(e.target) ||
              triggerRef.current?.contains(e.target)
            ) {
              e.preventDefault();
            }
          }}
        >
          <div className="relative" ref={anchorRef}>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendors…"
              className="h-8 text-sm border-0 border-b rounded-none focus-visible:ring-0 pr-8"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div
            className="max-h-52 overflow-y-auto overscroll-contain py-1"
            onScroll={(e) => handleLoadMore(e.currentTarget)}
            onWheel={(e) => {
              e.currentTarget.scrollTop += e.deltaY;
              e.stopPropagation();
              handleLoadMore(e.currentTarget);
            }}
          >
            {vendorOptions.length === 0 && !isFetching ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {debouncedQuery ? "No vendors found." : "Type to search vendors…"}
              </p>
            ) : (
              vendorOptions.map((vendor) => {
                const idStr = String(vendor.id);
                const isSelected = selectedIdSet.has(idStr);
                return (
                  <button
                    key={idStr}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleVendor(vendor)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent",
                      isSelected && "bg-accent/60",
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        isSelected ? "text-primary opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">
                      {vendor.name || vendor.vendor_name}
                    </span>
                  </button>
                );
              })
            )}
            {isFetching && (
              <p className="px-3 py-1.5 text-xs text-muted-foreground">Loading…</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ConnectedVendorMultiPicker;
