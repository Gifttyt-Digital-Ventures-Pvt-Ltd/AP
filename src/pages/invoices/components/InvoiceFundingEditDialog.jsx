import React, { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { formatCurrency } from "../../../utils/currency";
import { getInvoiceFundingSplitError } from "../utils/invoiceFunding";
import {
  formatNumericInputValue,
  parseNumericInput,
  sanitizeNumericInput,
} from "../utils/numericInput";

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const formatFundingInput = (value) => {
  const rounded = roundMoney(value);
  return Number.isFinite(rounded) ? String(rounded) : "";
};

const buildFundingForm = (invoice = {}, invoiceTotal = 0) => {
  const isFunded = Boolean(invoice?.isFunded ?? invoice?.is_funded);
  return {
    isFunded,
    orgAmount: isFunded
      ? formatFundingInput(invoice?.orgAmount ?? invoice?.org_amount ?? invoiceTotal)
      : "",
    financierAmount: isFunded
      ? formatFundingInput(invoice?.financierAmount ?? invoice?.financier_amount ?? 0)
      : "",
  };
};

const InvoiceFundingEditDialog = ({
  open,
  onOpenChange,
  invoice,
  invoiceTotal = 0,
  currency = "INR",
  onSave,
  saving = false,
}) => {
  const [form, setForm] = useState(() => buildFundingForm(invoice, invoiceTotal));
  const safeInvoiceTotal = Math.max(roundMoney(invoiceTotal), 0);

  useEffect(() => {
    if (!open) return;
    setForm(buildFundingForm(invoice, safeInvoiceTotal));
  }, [invoice, open, safeInvoiceTotal]);

  const splitError = useMemo(
    () =>
      getInvoiceFundingSplitError(form, safeInvoiceTotal, {
        enabled: true,
      }),
    [form, safeInvoiceTotal],
  );

  const getComplementAmount = (value) =>
    formatFundingInput(Math.max(safeInvoiceTotal - roundMoney(value), 0));

  const handleAmountChange = (field, value) => {
    const sanitizedValue = sanitizeNumericInput(value, { maxDecimalPlaces: 2 });
    const enteredAmount = Math.min(roundMoney(sanitizedValue), safeInvoiceTotal);
    const oppositeField = field === "orgAmount" ? "financierAmount" : "orgAmount";

    setForm((prev) => ({
      ...prev,
      [field]: sanitizedValue === "" ? "" : formatFundingInput(enteredAmount),
      [oppositeField]: getComplementAmount(enteredAmount),
    }));
  };

  const handleSubmit = () => {
    if (splitError) return;
    onSave?.({
      isFunded: Boolean(form.isFunded),
      orgAmount: form.isFunded ? roundMoney(parseNumericInput(form.orgAmount, 0)) : 0,
      financierAmount: form.isFunded
        ? roundMoney(parseNumericInput(form.financierAmount, 0))
        : 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Invoice Funding</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3">
            <Label className="text-xs text-muted-foreground">Invoice Total</Label>
            <p className="text-lg font-semibold">
              {formatCurrency(safeInvoiceTotal, currency)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-invoice-is-funded"
              checked={Boolean(form.isFunded)}
              onCheckedChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  isFunded: Boolean(value),
                  ...(value
                    ? {
                        orgAmount:
                          prev.orgAmount !== "" &&
                          prev.orgAmount !== null &&
                          prev.orgAmount !== undefined
                            ? formatFundingInput(
                                Math.min(roundMoney(prev.orgAmount), safeInvoiceTotal),
                              )
                            : formatFundingInput(safeInvoiceTotal),
                        financierAmount:
                          prev.orgAmount !== "" &&
                          prev.orgAmount !== null &&
                          prev.orgAmount !== undefined
                            ? getComplementAmount(prev.orgAmount)
                            : "0",
                      }
                    : {
                        orgAmount: "",
                        financierAmount: "",
                      }),
                }))
              }
            />
            <Label
              htmlFor="edit-invoice-is-funded"
              className="cursor-pointer text-sm font-medium"
            >
              Funded invoice
            </Label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Organization Funded Amount</Label>
              <Input
                value={formatNumericInputValue(form.orgAmount)}
                onChange={(event) => handleAmountChange("orgAmount", event.target.value)}
                placeholder="0.00"
                disabled={!form.isFunded}
                inputMode="decimal"
              />
            </div>
            <div>
              <Label className="text-xs">Financier Funded Amount</Label>
              <Input
                value={formatNumericInputValue(form.financierAmount)}
                onChange={(event) =>
                  handleAmountChange("financierAmount", event.target.value)
                }
                placeholder="0.00"
                disabled={!form.isFunded}
                inputMode="decimal"
              />
            </div>
          </div>

          {splitError ? (
            <p className="text-xs font-medium text-destructive">{splitError}</p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || Boolean(splitError)}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Funding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceFundingEditDialog;
