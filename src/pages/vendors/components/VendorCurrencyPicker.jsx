import React, { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { useGetAvailableCurrenciesQuery } from "../../../Services/apis/corporateApi";
import {
  CURRENCY_SCREENS,
  FALLBACK_CURRENCIES,
  mergeCurrencyOptions,
  normalizeCurrencyCode,
} from "../../../utils/currency";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "../../../components/ui/popover";

const VendorCurrencyPicker = ({
  value,
  onChange,
  label = "Currency",
  required = false,
  skipFetch = false,
}) => {
  const { data: availableCurrencies = [] } = useGetAvailableCurrenciesQuery(
    CURRENCY_SCREENS.INVOICE,
    { skip: skipFetch },
  );

  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState(value || "INR");

  useEffect(() => {
    setCurrencyQuery(value || "INR");
  }, [value]);

  const currencyOptions =
    Array.isArray(availableCurrencies) && availableCurrencies.length > 0
      ? availableCurrencies.filter((currency) => currency !== "ALL")
      : FALLBACK_CURRENCIES;
  const resolvedCurrencyOptions = useMemo(
    () => mergeCurrencyOptions(currencyOptions, FALLBACK_CURRENCIES, value),
    [currencyOptions, value],
  );
  const filteredCurrencyOptions = useMemo(() => {
    const query = String(currencyQuery || "").trim().toUpperCase();
    if (!query) return resolvedCurrencyOptions;
    return resolvedCurrencyOptions.filter((code) => code.includes(query));
  }, [currencyQuery, resolvedCurrencyOptions]);

  const applyCurrencyChange = (next) => {
    const normalized = normalizeCurrencyCode(next);
    onChange(normalized);
    setCurrencyQuery(normalized);
  };

  return (
    <div>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Popover open={currencyPickerOpen} onOpenChange={setCurrencyPickerOpen}>
        <PopoverAnchor asChild>
          <div className="relative mt-1.5">
            <Input
              value={currencyQuery}
              onChange={(event) => {
                const next = event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, "")
                  .slice(0, 3);
                setCurrencyQuery(next);
                setCurrencyPickerOpen(true);
                if (next.length === 3) {
                  applyCurrencyChange(next);
                }
              }}
              onFocus={() => setCurrencyPickerOpen(true)}
              onBlur={() => {
                const normalized = normalizeCurrencyCode(currencyQuery);
                if (String(currencyQuery || "").trim().length === 3) {
                  applyCurrencyChange(normalized);
                } else {
                  setCurrencyQuery(value || "INR");
                }
              }}
              placeholder="Select or type code (e.g. USD)"
              className="pr-10 uppercase"
              autoComplete="off"
              maxLength={3}
              required={required}
            />
            <button
              type="button"
              onClick={() => setCurrencyPickerOpen((open) => !open)}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              aria-label="Show currency list"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="max-h-56 overflow-y-auto py-1">
            {filteredCurrencyOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {String(currencyQuery || "").trim().length === 3
                  ? `Use ${normalizeCurrencyCode(currencyQuery)}`
                  : "No matching currencies — type a 3-letter ISO code"}
              </p>
            ) : (
              filteredCurrencyOptions.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent ${
                    value === code ? "bg-accent" : ""
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    applyCurrencyChange(code);
                    setCurrencyPickerOpen(false);
                  }}
                >
                  {code}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default VendorCurrencyPicker;
