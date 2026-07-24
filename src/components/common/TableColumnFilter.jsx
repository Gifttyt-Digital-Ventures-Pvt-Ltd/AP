import React from "react";
import { Filter, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import DatePicker from "./DatePicker";
import { cn } from "../../lib/utils";

const hasTextValue = (value) => String(value || "").trim().length > 0;

const hasDateRangeValue = (value = {}) =>
  hasTextValue(value.from) || hasTextValue(value.to);

const resolveHasValue = (type, value) => {
  if (type === "dateRange") return hasDateRangeValue(value);
  if (Array.isArray(value)) return value.length > 0;
  return hasTextValue(value);
};

const TableColumnFilter = ({
  title,
  type = "text",
  value,
  onChange,
  options = [],
  placeholder = "Filter",
  searchable = false,
  searchPlaceholder = "Search options",
  multiple = false,
  fromLabel = "From",
  toLabel = "To",
  allLabel = "All",
  align = "start",
  className = "",
}) => {
  const [optionQuery, setOptionQuery] = React.useState("");
  const hasValue = resolveHasValue(type, value);
  const selectedValues = React.useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );
  const filteredOptions = React.useMemo(() => {
    if (!searchable || !optionQuery.trim()) return options;
    const query = optionQuery.toLowerCase().trim();
    return options.filter((option) =>
      String(option.label || "").toLowerCase().includes(query),
    );
  }, [optionQuery, options, searchable]);

  const clearFilter = (event) => {
    event.stopPropagation();
    if (type === "dateRange") {
      onChange({ from: "", to: "" });
      return;
    }
    onChange(multiple ? [] : "");
  };

  const toggleOption = (optionValue) => {
    if (!multiple) {
      onChange(optionValue);
      return;
    }
    if (selectedValues.includes(optionValue)) {
      onChange(selectedValues.filter((item) => item !== optionValue));
      return;
    }
    onChange([...selectedValues, optionValue]);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span>{title}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded hover:bg-background/80",
              hasValue && "bg-primary/10 text-primary",
            )}
            aria-label={`Filter ${title}`}
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="z-[80] w-72 p-3" align={align}>
          {type === "dateRange" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">{fromLabel}</Label>
                  <DatePicker
                    value={value?.from || ""}
                    onChange={(nextFrom) =>
                      onChange({ ...(value || {}), from: nextFrom })
                    }
                    placeholder="Select start date"
                    size="sm"
                    className="mt-1"
                    popoverClassName="z-[90] w-auto p-0"
                  />
                </div>
                <div>
                  <Label className="text-xs">{toLabel}</Label>
                  <DatePicker
                    value={value?.to || ""}
                    onChange={(nextTo) =>
                      onChange({ ...(value || {}), to: nextTo })
                    }
                    placeholder="Select end date"
                    size="sm"
                    className="mt-1"
                    popoverClassName="z-[90] w-auto p-0"
                    minDate={value?.from || ""}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={clearFilter}
                disabled={!hasValue}
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
          ) : type === "select" ? (
            <div className="space-y-1">
              {searchable ? (
                <Input
                  value={optionQuery}
                  onChange={(event) => setOptionQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="mb-2 h-8 text-sm"
                  autoFocus
                />
              ) : null}
              <button
                type="button"
                onClick={() => onChange(multiple ? [] : "")}
                className={cn(
                  "w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                  !hasValue && "bg-primary/10 text-primary",
                )}
              >
                {allLabel}
              </button>
              <div className="max-h-60 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    No options found
                  </p>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleOption(option.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                        selectedValues.includes(option.value) &&
                          "bg-primary/10 text-primary",
                      )}
                    >
                      {multiple ? (
                        <span
                          className={cn(
                            "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                            selectedValues.includes(option.value) &&
                              "border-primary bg-primary text-primary-foreground",
                          )}
                        >
                          {selectedValues.includes(option.value) ? "✓" : ""}
                        </span>
                      ) : null}
                      {option.label}
                    </button>
                  ))
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-8 w-full text-xs"
                onClick={clearFilter}
                disabled={!hasValue}
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-8 text-sm"
                autoFocus
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 w-full text-xs"
                onClick={clearFilter}
                disabled={!hasValue}
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default TableColumnFilter;
