import React from "react";
import { X } from "lucide-react";

export const ActiveFilters = ({
  hasActiveFilters,
  getDateFilterLabel,
  clearDateFilter,
  appliedAccountFilter,
  setAppliedAccountFilter,
  appliedTypeFilter,
  setAppliedTypeFilter,
  clearAllFilters,
}) => {
  if (!hasActiveFilters()) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Filters:</span>
      {getDateFilterLabel() && (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
          {getDateFilterLabel()}
          <button onClick={clearDateFilter} className="hover:text-blue-900">
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      {appliedAccountFilter && (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
          {appliedAccountFilter}
          <button onClick={() => setAppliedAccountFilter("")}>
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      {appliedTypeFilter && (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
          {appliedTypeFilter}
          <button onClick={() => setAppliedTypeFilter("")}>
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">
        Clear all
      </button>
    </div>
  );
};

export default ActiveFilters;
