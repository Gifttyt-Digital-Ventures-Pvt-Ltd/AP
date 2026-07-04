import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { cn } from "../../lib/utils";

const TableSortButton = ({
  options = [],
  value,
  direction = "desc",
  onChange,
  label = "Sort",
}) => {
  const selectedOption =
    options.find((option) => option.value === value) || options[0];
  const DirectionIcon = direction === "asc" ? ArrowUp : ArrowDown;

  const updateSort = (nextValue, nextDirection = direction) => {
    onChange?.({ value: nextValue, direction: nextDirection });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <ArrowUpDown className="h-4 w-4" />
          <span>{label}: {selectedOption?.label || "Default"}</span>
          <DirectionIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{label} by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => updateSort(option.value, option.defaultDirection || direction)}
            className="justify-between"
          >
            <span>{option.label}</span>
            {value === option.value ? <Check className="h-4 w-4" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => updateSort(value, "desc")}
          className={cn("justify-between", direction === "desc" && "text-primary")}
        >
          Newest / highest first
          {direction === "desc" ? <Check className="h-4 w-4" /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => updateSort(value, "asc")}
          className={cn("justify-between", direction === "asc" && "text-primary")}
        >
          Oldest / lowest first
          {direction === "asc" ? <Check className="h-4 w-4" /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TableSortButton;
