import React from "react";
import { cn } from "../../lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const normalizeOption = (option) => {
  if (typeof option === "string" || typeof option === "number") {
    return {
      value: String(option),
      label: String(option),
    };
  }

  return {
    value: String(option?.value ?? option?.id ?? ""),
    label: String(option?.label ?? option?.name ?? option?.value ?? option?.id ?? ""),
    disabled: option?.disabled,
  };
};

const optionsFromChildren = (children) =>
  React.Children.toArray(children)
    .map((child) => {
      if (!React.isValidElement(child)) return null;
      const value = child.props?.value;
      if (value === undefined || value === null || value === "") return null;
      return {
        value: String(value),
        label: String(child.props?.children ?? value),
        disabled: child.props?.disabled,
      };
    })
    .filter(Boolean);

const AppSelect = ({
  options = [],
  placeholder,
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  id,
  name,
  ...props
}) => {
  const normalizedOptions = (children ? optionsFromChildren(children) : options.map(normalizeOption))
    .filter((option) => option.value);
  const stringValue =
    value === undefined || value === null ? undefined : String(value);
  const stringDefaultValue =
    defaultValue === undefined || defaultValue === null
      ? undefined
      : String(defaultValue);

  return (
    <Select
      value={stringValue}
      defaultValue={stringDefaultValue}
      onValueChange={(nextValue) =>
        onChange?.({
          target: {
            id,
            name,
            value: nextValue,
          },
        })
      }
      disabled={disabled}
      name={name}
    >
      <SelectTrigger
        id={id}
        className={cn("h-9 w-full bg-background text-sm", className)}
        disabled={disabled}
        {...props}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default AppSelect;
