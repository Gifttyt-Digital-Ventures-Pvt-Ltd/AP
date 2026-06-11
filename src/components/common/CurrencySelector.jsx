import React from "react";
import { Label } from "../ui/label";
import { cn } from "../../lib/utils";
import AppSelect from "./AppSelect";
import { DEFAULT_CURRENCY } from "../../utils/currency";

const CurrencySelector = ({
  currencies = [],
  value = DEFAULT_CURRENCY,
  onChange,
  disabled = false,
  className = "",
  label = "Currency",
  showLabel = true,
  variant = "field",
  id = "currency-filter",
  selectClassName = "",
}) => {
  const options = currencies.map((currency) => ({
    value: currency,
    label: currency === "ALL" ? "All currencies" : currency,
  }));

  const select = (
    <AppSelect
      id={id}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      disabled={disabled || options.length === 0}
      options={options}
      className={cn(
        "h-10",
        variant === "inline" ? "w-[140px]" : "w-full",
        selectClassName,
      )}
      aria-label={!showLabel ? label : undefined}
    />
  );

  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showLabel ? (
          <Label htmlFor={id} className="mb-0 shrink-0 text-sm font-medium">
            {label}
          </Label>
        ) : null}
        {select}
      </div>
    );
  }

  if (!showLabel) {
    return <div className={className}>{select}</div>;
  }

  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-1">{select}</div>
    </div>
  );
};

export default CurrencySelector;
