import * as React from "react"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4 sm:flex-row",
        month: "space-y-4",
        month_caption: "relative flex h-10 items-center justify-center pt-1",
        caption_label:
          "relative z-10 inline-flex h-8 items-center whitespace-nowrap rounded-md border border-input bg-background px-2 pr-7 text-sm font-medium",
        nav: "pointer-events-none absolute inset-x-1 top-4 z-10 flex items-center justify-between",
        dropdowns: "flex items-center justify-center gap-2",
        dropdown_root: "relative inline-flex h-8 min-w-[92px] cursor-pointer items-center",
        dropdown:
          "absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0",
        months_dropdown: "",
        years_dropdown: "",
        chevron:
          "absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "pointer-events-auto relative z-20 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "pointer-events-auto relative z-20 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 rounded-md text-center text-[0.8rem] font-normal text-muted-foreground",
        weeks: "mt-2",
        week: "flex w-full",
        day: cn(
          "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md"
            : ""
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal"
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus:bg-primary [&>button]:focus:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside:
          "[&>button]:text-muted-foreground [&>button]:opacity-50",
        disabled:
          "[&>button]:text-muted-foreground [&>button]:opacity-50",
        range_middle:
          "[&>button]:bg-accent [&>button]:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
            <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
            );
          }
          if (orientation === "right") {
            return (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
            );
          }
          return (
            <ChevronDown className={cn("h-4 w-4", className)} {...props} />
          );
        },
      }}
      {...props} />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
