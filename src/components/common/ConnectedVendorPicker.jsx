import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { ChevronDown, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "../ui/popover";
import { Input } from "../ui/input";
import { cn } from "../../lib/utils";
import { useGetVendorsQuery } from "../../Services/apis/invoicesVendorsApi";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const PAGE_SIZE = 20;

const vendorMatchesSearch = (vendor = {}, query = "") => {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  return (
    (vendor.name || "").toLowerCase().includes(q) ||
    (vendor.vendorId || "").toLowerCase().includes(q) ||
    (vendor.pan || "").toLowerCase().includes(q) ||
    (vendor.gstin || "").toLowerCase().includes(q)
  );
};

export const ConnectedVendorPicker = ({
  value,
  onSelect,
  allowFreeText = false,
  placeholder = "Select vendor",
  className,
  triggerContent,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  
  const [offset, setOffset] = useState(0);
  const [accumulatedVendors, setAccumulatedVendors] = useState([]);

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

  useEffect(() => {
    if (currentPageVendors.length === 0) return;
    setAccumulatedVendors((prev) => {
      if (offset === 0) {
        return currentPageVendors;
      }
      const existingIds = new Set(prev.map((v) => v.id));
      const newVendors = currentPageVendors.filter((v) => !existingIds.has(v.id));
      return [...prev, ...newVendors];
    });
  }, [currentPageVendors, offset]);

  const vendorOptions = offset === 0 && accumulatedVendors.length === 0
    ? currentPageVendors
    : accumulatedVendors;

  const totalVendors = Number(vendorsData?.total ?? vendorOptions.length);
  const hasMore = Boolean(vendorsData?.hasMore ?? vendorOptions.length < totalVendors);

  const anchorRef = useRef(null);
  const triggerRef = useRef(null);
  const lastLoadCountRef = useRef(0);

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return vendorOptions;
    return vendorOptions.filter((v) => vendorMatchesSearch(v, q));
  }, [vendorOptions, query]);

  const handleLoadMore = useCallback((element) => {
    if (!hasMore || isFetching) return;
    if (!element) return;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const scrollableDistance = Math.max(scrollHeight - clientHeight, 0);
    if (scrollableDistance === 0) return;
    const remainingDistance = scrollHeight - scrollTop - clientHeight;
    const bottomThreshold = scrollableDistance * 0.2;
    if (remainingDistance > bottomThreshold) return;
    if (lastLoadCountRef.current === vendorOptions.length) return;
    lastLoadCountRef.current = vendorOptions.length;
    setOffset((prevOffset) => prevOffset + PAGE_SIZE);
  }, [hasMore, isFetching, vendorOptions.length]);

  useEffect(() => {
    if (isFetching) return;
    lastLoadCountRef.current = 0;
  }, [vendorOptions.length, isFetching]);

  const handleSelect = (vendor) => {
    onSelect(vendor);
    setQuery("");
    setOpen(false);
  };

  const handleFreeTextSubmit = () => {
    if (allowFreeText && query.trim()) {
      onSelect({ name: query.trim(), id: null, isFreeText: true });
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        {triggerContent ? (
          <div ref={triggerRef} onClick={() => setOpen((o) => !o)}>
            {triggerContent}
          </div>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            data-testid="connected-vendor-picker-trigger"
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
        )}
      </PopoverAnchor>
      <PopoverContent
        className="z-[120] min-w-[260px] overflow-y-auto w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (
            anchorRef.current?.contains(event.target) ||
            triggerRef.current?.contains(event.target)
          ) {
            event.preventDefault();
          }
        }}
      >
        <div className="relative" ref={anchorRef}>
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredOptions.length === 1 && !allowFreeText) {
                  handleSelect(filteredOptions[0]);
                } else {
                  handleFreeTextSubmit();
                }
              }
            }}
            onFocus={() => {
              setOpen(true);
            }}
            placeholder={allowFreeText ? "Select or enter vendor name" : "Search vendors..."}
            className="pr-16 h-8 text-sm border-0 border-b rounded-none focus-visible:ring-0"
            autoComplete="off"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setOpen(true);
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Show options"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div
          className="max-h-56 overflow-y-auto overscroll-contain py-1"
          onScroll={(event) => handleLoadMore(event.currentTarget)}
          onWheel={(event) => {
            event.currentTarget.scrollTop += event.deltaY;
            event.stopPropagation();
            handleLoadMore(event.currentTarget);
          }}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground flex flex-col gap-2">
              {isFetching ? (
                "Loading vendors..."
              ) : (
                <>
                  <p>No vendors found.</p>
                  {allowFreeText && query.trim() && (
                    <button
                      type="button"
                      onClick={handleFreeTextSubmit}
                      className="text-left font-medium text-primary hover:underline"
                    >
                      Use "{query.trim()}"
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            filteredOptions.map((vendor) => (
              <button
                key={vendor.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                  (value === vendor.name || value === vendor.id) && "bg-accent"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(vendor)}
              >
                <span className="truncate">{vendor.name || vendor.vendor_name}</span>
                {vendor.isPendingApproval && (
                  <span className="ml-auto shrink-0 text-[10px] text-amber-600">
                    Pending
                  </span>
                )}
              </button>
            ))
          )}
          {hasMore ? (
            <div className="border-t px-3 py-2 text-center text-xs text-muted-foreground">
              {isFetching ? "Loading more..." : "Scroll for more vendors"}
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ConnectedVendorPicker;
