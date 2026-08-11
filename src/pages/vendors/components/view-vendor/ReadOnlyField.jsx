import React from "react";
import { cn } from "../../../../lib/utils";
import { Label } from "../../../../components/ui/label";

export const ReadOnlyValue = ({ value, placeholder = "—", className = "" }) => (
  <p
    className={cn(
      "break-words text-sm text-foreground",
      !value && "text-muted-foreground",
      className,
    )}
  >
    {value || placeholder}
  </p>
);

const ReadOnlyField = ({ label, value, placeholder, className = "" }) => (
  <div className={className}>
    {label ? <Label>{label}</Label> : null}
    <ReadOnlyValue value={value} placeholder={placeholder} className="mt-1" />
  </div>
);

export default ReadOnlyField;
