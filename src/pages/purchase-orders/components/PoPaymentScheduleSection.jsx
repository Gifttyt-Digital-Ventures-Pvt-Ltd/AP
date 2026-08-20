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
  normalizePaymentScheduleBasis,
} from "../utils/poPaymentSchedule";

const editableHeader = [
  { key: "sequence", title: "#", headerClassName: "w-[64px]" },
  { key: "triggerStage", title: "Trigger", headerClassName: "w-[120px]" },
  { key: "label", title: "Label", headerClassName: "w-[220px]" },
  { key: "value", title: "Value", headerClassName: "w-[120px]" },
  { key: "actions", title: "", headerClassName: "w-[48px]" },
];

const readOnlyHeader = editableHeader.filter((header) => header.key !== "actions");

const inputClassName = "h-9 bg-white/80 text-sm";

const PoPaymentScheduleSection = ({
  rows = [],
  poGrossTotal = 0,
  formatCurrency,
  onChange,
  readOnly = false,
}) => {
  const summary = getPaymentScheduleSummary(rows, poGrossTotal);
  const showDifferenceWarning = Math.abs(summary.difference) > 0.009;
  const scheduleRows = Array.isArray(rows) ? rows : [];
  const firstRowBasis = normalizePaymentScheduleBasis(scheduleRows[0]?.basis);
  const [selectedBasis, setSelectedBasis] = useState(firstRowBasis);
  const scheduleBasis = scheduleRows.length ? firstRowBasis : selectedBasis;

  useEffect(() => {
    if (scheduleRows.length) setSelectedBasis(firstRowBasis);
  }, [firstRowBasis, scheduleRows.length]);

  const updateScheduleBasis = (basis) => {
    const normalizedBasis = normalizePaymentScheduleBasis(basis);
    setSelectedBasis(normalizedBasis);
    onChange?.(scheduleRows.map((row) => ({ ...row, basis: normalizedBasis })));
  };

  const updateRow = (index, field, value) => {
    onChange?.(
      scheduleRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, [field]: value };
        if (field === "triggerStage") {
          next.label = next.label || (value === "TI" ? "Payable on invoice" : `Advance on ${value}`);
        }
        return next;
      }),
    );
  };

  const addRow = () => {
    onChange?.([...scheduleRows, createEmptyPaymentScheduleRow(scheduleRows.length + 1, scheduleBasis)]);
  };

  const removeRow = (index) => {
    onChange?.(
      scheduleRows
        .filter((_, rowIndex) => rowIndex !== index)
        .map((row, rowIndex) => ({ ...row, sequence: rowIndex + 1 })),
    );
  };

  const renderRow = (row, index, headers) => {
    return (
      <TableRow key={`${row.sequence}-${index}`} className="bg-white">
        {headers.map((header) => {
          let content;
          switch (header.key) {
            case "sequence":
              content = index + 1;
              break;
            case "triggerStage":
              content = readOnly ? row.triggerStage : (
                <Select value={row.triggerStage} onValueChange={(value) => updateRow(index, "triggerStage", value)}>
                  <SelectTrigger className="h-9 bg-white/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_SCHEDULE_TRIGGER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
              break;
            case "label":
              content = readOnly ? row.label || "-" : (
                <Input
                  value={row.label || ""}
                  onChange={(event) => updateRow(index, "label", event.target.value)}
                  placeholder="Milestone label"
                  className={inputClassName}
                />
              );
              break;
            case "value":
              content = readOnly ? row.value : (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.value ?? ""}
                  onChange={(event) => updateRow(index, "value", event.target.value)}
                  className={inputClassName}
                />
              );
              break;
            case "actions":
              content = !readOnly ? (
                <Button variant="ghost" size="icon" onClick={() => removeRow(index)} disabled={scheduleRows.length === 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : null;
              break;
            default:
              content = row?.[header.key] || "-";
          }

          return (
            <TableCell key={header.key} className={header.cellClassName}>
              {content}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  if (readOnly && scheduleRows.length === 0) return null;

  return (
    <section className="mt-6 rounded border bg-slate-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Payment Schedule</h3>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-40">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Schedule Basis</p>
            {readOnly ? (
              <div className="rounded-md border bg-white px-3 py-2 text-sm font-medium">
                {PAYMENT_SCHEDULE_BASIS_OPTIONS.find((option) => option.value === scheduleBasis)?.label || scheduleBasis}
              </div>
            ) : (
              <Select value={scheduleBasis} onValueChange={updateScheduleBasis}>
                <SelectTrigger className="h-9 bg-white/80">
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
          {!readOnly ? (
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-4 w-4" />
              Add Milestone
            </Button>
          ) : null}
        </div>
      </div>

      {scheduleRows.length ? (
        <div className="overflow-x-auto rounded border bg-white">
          <AppDataTable
            tableHeader={readOnly ? readOnlyHeader : editableHeader}
            tableData={scheduleRows}
            renderRow={renderRow}
            tableClassName="min-w-[560px]"
          />
        </div>
      ) : (
        <div className="rounded border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
          No payment schedule rows added.
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <div className="rounded border bg-white px-3 py-2">
          <p className="text-xs text-muted-foreground">Scheduled Total</p>
          <p className="font-semibold">{formatCurrency(summary.scheduledTotal)}</p>
        </div>
        <div className="rounded border bg-white px-3 py-2">
          <p className="text-xs text-muted-foreground">PO Gross Total</p>
          <p className="font-semibold">{formatCurrency(summary.poGrossTotal)}</p>
        </div>
        <div className="rounded border bg-white px-3 py-2">
          <p className="text-xs text-muted-foreground">Difference</p>
          <p className={`font-semibold ${showDifferenceWarning ? "text-amber-700" : "text-emerald-700"}`}>
            {formatCurrency(summary.difference)}
          </p>
        </div>
      </div>

      {showDifferenceWarning ? (
        <div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Scheduled total does not match the PO gross total. Draft save is allowed; backend validation remains authoritative for submission and approval.
          </p>
        </div>
      ) : null}
    </section>
  );
};

export default PoPaymentScheduleSection;
