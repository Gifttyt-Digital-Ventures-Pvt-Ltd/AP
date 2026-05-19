import React from "react";
import { cn } from "../../lib/utils";

const normalizeOption = (option) => {
  if (typeof option === "string" || typeof option === "number") {
    return {
      value: String(option),
      label: String(option),
    };
  }

  return {
    value: option?.value ?? option?.id ?? "",
    label: option?.label ?? option?.name ?? option?.value ?? option?.id ?? "",
    disabled: option?.disabled,
  };
};

const AppSelect = ({
  options = [],
  placeholder,
  className,
  children,
  ...props
}) => (
  <select
    className={cn(
      "h-9 w-full rounded-md border border-input bg-background pl-3 pr-8 text-sm",
      "focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {children ||
      options.map((option) => {
        const normalized = normalizeOption(option);
        return (
          <option key={normalized.value} value={normalized.value} disabled={normalized.disabled}>
            {normalized.label}
          </option>
        );
      })}
  </select>
);

export default AppSelect;
