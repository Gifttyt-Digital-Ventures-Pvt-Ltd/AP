import React, { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { cn } from "../../lib/utils";

const CALENDAR_START_MONTH = new Date(new Date().getFullYear() - 10, 0);
const CALENDAR_END_MONTH = new Date(2099, 11);

const parseIsoDateValue = (value) => {
  if (!value) return undefined;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const toIsoDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatIsoDateDisplay = (value) => {
  const date = parseIsoDateValue(value);
  if (!date) return "";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const DatePicker = ({
  value = "",
  onChange,
  onAfterSelect,
  placeholder = "Select date",
  disabled = false,
  disableDate,
  minDate = "",
  maxDate = "",
  className = "",
  buttonClassName = "",
  align = "start",
  popoverClassName = "z-[80] w-auto p-0",
  size = "default",
  showIcon = true,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const minSelectableDate = parseIsoDateValue(minDate);
  const maxSelectableDate = parseIsoDateValue(maxDate);

  const handleSelect = (date) => {
    const isoValue = toIsoDateValue(date);
    onChange?.(isoValue);
    onAfterSelect?.(date, isoValue);
    setOpen(false);
  };

  const isDateDisabled = (date) => {
    if (minSelectableDate && date < minSelectableDate) return true;
    if (maxSelectableDate && date > maxSelectableDate) return true;
    return disableDate?.(date) ?? false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            size === "sm" ? "h-8 px-2 text-xs" : "h-9",
            !value && "text-muted-foreground",
            className,
            buttonClassName,
          )}
        >
          {showIcon ? (
            <CalendarIcon
              className={cn(
                "mr-2 shrink-0",
                size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
              )}
            />
          ) : null}
          <span className="truncate">
            {value ? formatIsoDateDisplay(value) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className={popoverClassName} align={align}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          navLayout="after"
          startMonth={CALENDAR_START_MONTH}
          endMonth={CALENDAR_END_MONTH}
          selected={parseIsoDateValue(value)}
          onSelect={handleSelect}
          disabled={isDateDisabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
