import React, { useEffect, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import AppDataTable from "../../../components/common/AppDataTable";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { TableCell, TableRow } from "../../../components/ui/table";
import {
  PAYMENT_SCHEDULE_BASIS_OPTIONS,
  PAYMENT_SCHEDULE_TRIGGER_OPTIONS,
  createEmptyPaymentScheduleRow,
  getPaymentScheduleSummary,
  getNextPaymentScheduleTriggerStage,
  inferPaymentScheduleBasis,
  isPaymentScheduleRowLocked,
  normalizePaymentScheduleBasis,
  normalizePaymentScheduleTriggerStage,
} from "../utils/poPaymentSchedule";

const editableHeader = [
  { key: "sequence", title: "#", headerClassName: "w-[64px]" },
  { key: "triggerStage", title: "Trigger", headerClassName: "w-[120px]" },
  { key: "label", title: "Remark", headerClassName: "w-[220px]" },
  { key: "value", title: "Value", headerClassName: "w-[120px]" },
  { key: "actions", title: "", headerClassName: "w-[48px]" },
];

const readOnlyHeader = editableHeader.filter((header) => header.key !== "actions");

const inputClassName = "h-9 bg-white/80 text-sm";
const errorInputClassName = "border-red-400 bg-red-50 focus-visible:ring-red-300";

const PoPaymentScheduleSection = ({
  rows = [],
  documentGrossTotal,
  poGrossTotal = 0,
  formatCurrency,
  onChange,
  readOnly = false,
  validationErrors = [],
  enabledTriggerStages,
}) => {
  const scheduleRows = Array.isArray(rows) ? rows : [];
  const enabledTriggerStageSet = new Set(
    (Array.isArray(enabledTriggerStages) && enabledTriggerStages.length
      ? enabledTriggerStages
      : PAYMENT_SCHEDULE_TRIGGER_OPTIONS.map((option) => option.value)
    ).map(normalizePaymentScheduleTriggerStage),
  );
  const addableTriggerOptions = PAYMENT_SCHEDULE_TRIGGER_OPTIONS.filter((option) =>
    enabledTriggerStageSet.has(option.value),
  );
  const scheduleErrors = Array.isArray(validationErrors)
    ? validationErrors.filter(Boolean)
    : [validationErrors].filter(Boolean);
  const hasValidationErrors = scheduleErrors.length > 0;
  const grossTotal = documentGrossTotal ?? poGrossTotal;
  const firstRowBasis = inferPaymentScheduleBasis(scheduleRows, grossTotal);
  const [selectedBasis, setSelectedBasis] = useState(firstRowBasis);
  const scheduleBasis = scheduleRows.length ? firstRowBasis : selectedBasis;
  const effectiveRows = scheduleRows.map((row) => ({ ...row, basis: scheduleBasis }));
  const summary = getPaymentScheduleSummary(effectiveRows, grossTotal);
  const showDifferenceWarning = Math.abs(summary.difference) > 0.009;
  const usedAddableTriggerCount = new Set(
    scheduleRows
      .map((row) => normalizePaymentScheduleTriggerStage(row.triggerStage))
      .filter((triggerStage) => enabledTriggerStageSet.has(triggerStage)),
  ).size;
  const canAddMilestone = usedAddableTriggerCount < addableTriggerOptions.length;
  const hasLockedRows = effectiveRows.some((row) => isPaymentScheduleRowLocked(row));
  const showCompactEmptyState = !readOnly && scheduleRows.length === 0 && !hasValidationErrors;

  useEffect(() => {
    if (scheduleRows.length) setSelectedBasis(firstRowBasis);
  }, [firstRowBasis, scheduleRows.length]);

  useEffect(() => {
    if (readOnly || !scheduleRows.length) return;
    const hasBasisMismatch = scheduleRows.some(
      (row) => normalizePaymentScheduleBasis(row.basis) !== firstRowBasis,
    );
    if (!hasBasisMismatch) return;
    onChange?.(scheduleRows.map((row) => ({ ...row, basis: firstRowBasis })));
  }, [firstRowBasis, onChange, readOnly, scheduleRows]);

  const updateScheduleBasis = (basis) => {
    if (hasLockedRows) return;
    const normalizedBasis = normalizePaymentScheduleBasis(basis);
    setSelectedBasis(normalizedBasis);
    onChange?.(scheduleRows.map((row) => ({ ...row, basis: normalizedBasis })));
  };

  const updateRow = (index, field, value) => {
    if (isPaymentScheduleRowLocked(scheduleRows[index])) return;
    onChange?.(
      scheduleRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        return { ...row, [field]: value };
      }),
    );
  };

  const addRow = () => {
    const nextTriggerStage = getNextPaymentScheduleTriggerStage(scheduleRows, addableTriggerOptions);
    if (!nextTriggerStage) return;
    onChange?.([
      ...scheduleRows,
      createEmptyPaymentScheduleRow(scheduleRows.length + 1, scheduleBasis, nextTriggerStage),
    ]);
  };

  const removeRow = (index) => {
    if (isPaymentScheduleRowLocked(scheduleRows[index])) return;
    onChange?.(
      scheduleRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, sequence: rowIndex + 1 })),
    );
  };

  const renderRow = (row, index, headers) => {
    const rowLocked = isPaymentScheduleRowLocked(row);
    const rowErrorPrefix = `Payment Schedule row ${index + 1}:`;
    const rowErrors = scheduleErrors.filter((error) => error.startsWith(rowErrorPrefix));
    const hasTotalError = scheduleErrors.includes("Payment Schedule total must match the document gross total.");
    const hasValueError =
      hasTotalError ||
      rowErrors.some((error) => {
        const normalizedError = error.toLowerCase();
        return normalizedError.includes("value") || normalizedError.includes("negative");
      });
    const hasTriggerError = rowErrors.some((error) => error.toLowerCase().includes("trigger stage"));
    const lockReason =
      row.lockReason ||
      row.lock_reason ||
      row.disabledReason ||
      row.disabled_reason ||
      "This milestone already has paid or settled payment activity.";
    const isTriggerDisabled = (triggerStage) =>
      scheduleRows.some(
        (scheduleRow, rowIndex) =>
          rowIndex !== index &&
          normalizePaymentScheduleTriggerStage(scheduleRow.triggerStage) === triggerStage,
      );
    const rowTriggerStage = normalizePaymentScheduleTriggerStage(row.triggerStage);
    const rowTriggerOptions = PAYMENT_SCHEDULE_TRIGGER_OPTIONS.filter(
      (option) => enabledTriggerStageSet.has(option.value) || option.value === rowTriggerStage,
    );

    return (
      <TableRow key={`${row.sequence}-${index}`} className="bg-white">
        {headers.map((header) => {
          let content;
          switch (header.key) {
            case "sequence":
              content = index + 1;
              break;
            case "triggerStage":
              content = readOnly || rowLocked ? row.triggerStage : (
                <Select value={row.triggerStage} onValueChange={(value) => updateRow(index, "triggerStage", value)}>
                  <SelectTrigger className={`h-9 bg-white/80 ${hasTriggerError ? errorInputClassName : ""}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rowTriggerOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={isTriggerDisabled(option.value)}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
              break;
            case "label":
              content = readOnly || rowLocked ? row.label || "-" : (
                <Input
                  value={row.label || ""}
                  onChange={(event) => updateRow(index, "label", event.target.value)}
                  placeholder="Optional remark"
                  className={inputClassName}
                />
              );
              break;
            case "value":
              content = readOnly || rowLocked ? row.value : (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.value ?? ""}
                  onChange={(event) => updateRow(index, "value", event.target.value)}
                  className={`${inputClassName} ${hasValueError ? errorInputClassName : ""}`}
                />
              );
              break;
            case "actions":
              content = !readOnly ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(index)}
                  disabled={rowLocked}
                  title={rowLocked ? lockReason : "Remove milestone"}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : null;
              break;
            default:
              content = row?.[header.key] || "-";
          }

          return (
            <TableCell key={header.key} className={header.cellClassName}>
              <div className="space-y-1">
                {content}
                {header.key === "label" && rowLocked ? (
                  <p className="text-[11px] text-muted-foreground">{lockReason}</p>
                ) : null}
              </div>
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  if (readOnly && scheduleRows.length === 0) return null;

  return (
    <section
      className={`mt-6 rounded border p-4 ${
        hasValidationErrors
          ? "border-red-300 bg-red-50/40 ring-1 ring-red-200"
          : "bg-slate-50/60"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Payment Schedule</h3>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {!showCompactEmptyState ? (
            <div className="min-w-40">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Schedule Basis</p>
              {readOnly ? (
                <div className="rounded-md border bg-white px-3 py-2 text-sm font-medium">
                  {PAYMENT_SCHEDULE_BASIS_OPTIONS.find((option) => option.value === scheduleBasis)?.label || scheduleBasis}
                </div>
              ) : (
                <Select value={scheduleBasis} onValueChange={updateScheduleBasis} disabled={hasLockedRows}>
                  <SelectTrigger
                    className={`h-9 ${
                      hasLockedRows
                        ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500 opacity-70"
                        : "bg-white/80"
                    }`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SCHEDULE_BASIS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}
          {!readOnly ? (
            <Button variant="outline" size="sm" onClick={addRow} disabled={!canAddMilestone}>
              <Plus className="mr-1 h-4 w-4" />
              Add Milestone
            </Button>
          ) : null}
        </div>
      </div>

      {showCompactEmptyState ? null : scheduleRows.length ? (
        <div className="overflow-x-auto rounded border bg-white">
          <AppDataTable
            tableHeader={readOnly ? readOnlyHeader : editableHeader}
            tableData={effectiveRows}
            renderRow={renderRow}
            tableClassName="min-w-[560px]"
          />
        </div>
      ) : (
        <div className="rounded border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          No payment schedule rows added.
        </div>
      )}

      {!showCompactEmptyState ? (
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <div className="rounded border bg-white px-3 py-2">
          <p className="text-xs text-muted-foreground">Scheduled Total</p>
          <p className="font-semibold">{formatCurrency(summary.scheduledTotal)}</p>
        </div>
        <div className="rounded border bg-white px-3 py-2">
          <p className="text-xs text-muted-foreground">Document Gross Total</p>
          <p className="font-semibold">{formatCurrency(summary.poGrossTotal)}</p>
        </div>
        <div className="rounded border bg-white px-3 py-2">
          <p className="text-xs text-muted-foreground">Difference</p>
          <p className={`font-semibold ${showDifferenceWarning ? "text-amber-700" : "text-emerald-700"}`}>
            {formatCurrency(summary.difference)}
          </p>
        </div>
      </div>
      ) : null}

      {!showCompactEmptyState && showDifferenceWarning ? (
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Scheduled total must match the document gross total before it can be saved.
          </p>
        </div>
      ) : null}

      {hasValidationErrors ? (
        <div className="mt-3 flex items-start gap-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p>Fix the Payment Schedule errors below.</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {scheduleErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {!readOnly && hasLockedRows ? (
        <div className="mt-3 rounded border border-slate-200 bg-white px-3 py-2 text-xs text-muted-foreground">
          Paid or settled milestones are locked. You can adjust remaining unpaid milestones, but locked rows cannot be changed or removed.
        </div>
      ) : null}
    </section>
  );
};

export default PoPaymentScheduleSection;
