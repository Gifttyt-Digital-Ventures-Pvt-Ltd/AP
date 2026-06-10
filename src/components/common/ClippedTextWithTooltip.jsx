import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

const ClippedTextWithTooltip = ({
  text,
  className = "",
  maxWidthClass = "max-w-[200px]",
}) => {
  const value = String(text || "").trim() || "-";
  if (value === "-") return value;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`block truncate ${maxWidthClass} ${className}`.trim()}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {value}
      </TooltipContent>
    </Tooltip>
  );
};

export default ClippedTextWithTooltip;
