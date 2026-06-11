import React, { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { formatCurrency } from "../../../utils/currency";
import BeneficiaryStatusBadge from "../../banking/components/BeneficiaryStatusBadge";
import {
  filterEnabledModes,
  generateClientReference,
  getModeCutoffNotice,
  isValidRemarks,
  sanitizeRemarks,
  suggestPayoutMode,
  validateAmountForMode,
} from "../../banking/utils/modeRules";
import { PAYOUT_STATUS } from "../../banking/constants";

const isBeneficiarySelectable = (bene) => {
  if (!bene) return false;
  if (bene.status === "ACTIVE") return true;
  if (bene.status === "ACTIVATING" && bene.availableAt) {
    return new Date(bene.availableAt) <= new Date();
  }
  return false;
};

const IciciPayoutDialog = ({
  open,
  onOpenChange,
  selectedInvoices = [],
  linkedAccount,
  beneficiaries = [],
  enabledModes = ["IMPS", "NEFT", "RTGS", "INEFT"],
  onSubmitPayout,
  onSubmitBulkPayouts,
  onRegisterBeneficiary,
  submitting = false,
}) => {
  const [step, setStep] = useState("form");
  const [mode, setMode] = useState("IMPS");
  const [remarks, setRemarks] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [settlementId, setSettlementId] = useState(null);

  const modes = useMemo(() => filterEnabledModes(enabledModes), [enabledModes]);

  const totalAmount = useMemo(
    () => selectedInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0),
    [selectedInvoices],
  );

  const vendorId = selectedInvoices[0]?.vendorId ?? selectedInvoices[0]?.vendor_id;
  const vendorName = selectedInvoices[0]?.vendorName ?? selectedInvoices[0]?.vendor_name;

  const vendorBeneficiary = useMemo(() => {
    if (!vendorId) return null;
    return beneficiaries.find(
      (b) => String(b.vendorId) === String(vendorId),
    ) || null;
  }, [beneficiaries, vendorId]);

  const multipleVendors = useMemo(() => {
    const vendorIds = new Set(
      selectedInvoices.map((inv) => inv.vendorId ?? inv.vendor_id).filter(Boolean),
    );
    return vendorIds.size > 1;
  }, [selectedInvoices]);

  const beneSelectable = isBeneficiarySelectable(vendorBeneficiary);
  const amountValidation = validateAmountForMode(totalAmount, mode);
  const cutoffNotice = getModeCutoffNotice(mode);
  const remarksValid = isValidRemarks(remarks);
  const isBulk = selectedInvoices.length > 1;

  useEffect(() => {
    if (!open) {
      setStep("form");
      setRemarks("");
      setSettlementId(null);
      return;
    }
    setClientReference(generateClientReference());
    setMode(suggestPayoutMode(totalAmount));
  }, [open, totalAmount]);

  const canProceed =
    selectedInvoices.length > 0 &&
    !multipleVendors &&
    beneSelectable &&
    amountValidation.valid &&
    remarksValid;

  const executePayout = async () => {
    if (!canProceed) return null;

    const basePayload = {
      mode,
      remarks: remarks.trim(),
      clientReference,
      settlementId,
    };

    if (isBulk) {
      const items = selectedInvoices.map((invoice) => ({
        invoiceIds: [invoice.id],
        beneficiaryBnfId: vendorBeneficiary.bnfId,
        amount: Number(invoice.amount || 0),
        remarks: remarks.trim(),
        clientReference: generateClientReference(),
        settlementId,
      }));
      return onSubmitBulkPayouts?.({ items });
    }

    return onSubmitPayout?.({
      ...basePayload,
      invoiceIds: selectedInvoices.map((inv) => inv.id),
      beneficiaryBnfId: vendorBeneficiary.bnfId,
      amount: totalAmount,
    });
  };

  const handleResultClose = (result) => {
    const status = String(result?.normalizedStatus || "").toUpperCase();
    if (status === PAYOUT_STATUS.SUCCESS) {
      toast.success(result.utr ? `Payout successful. UTR: ${result.utr}` : "Payout successful");
    } else if (status === PAYOUT_STATUS.FAILED) {
      toast.error(result.message || "Payout failed");
      setSettlementId(result.settlementId || settlementId || `settle-${Date.now()}`);
      setClientReference(generateClientReference());
      setStep("form");
      return;
    } else {
      toast.info("Payout initiated — confirming with bank");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="icici-payout-dialog">
        <DialogHeader>
          <DialogTitle>
            {step === "confirm" ? "Confirm & Release Payment" : "Release Payment (ICICI)"}
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-4">
            <div>
              <Label>Invoice(s)</Label>
              <div className="mt-1 max-h-28 overflow-y-auto rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {selectedInvoices.map((inv) => (
                  <div key={inv.id} className="flex justify-between gap-2 py-0.5">
                    <span className="truncate">{inv.invoiceNumber} · {inv.vendorName}</span>
                    <span className="shrink-0">{formatCurrency(inv.amount, "INR")}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total: {formatCurrency(totalAmount, "INR")}
              </p>
            </div>

            {multipleVendors && (
              <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                Bulk release requires invoices from the same vendor. Select invoices for one vendor only.
              </div>
            )}

            <div>
              <Label>Vendor → Beneficiary</Label>
              {vendorBeneficiary ? (
                <div className="mt-1 flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{vendorBeneficiary.name || vendorName}</p>
                    <p className="text-xs text-muted-foreground">
                      {vendorBeneficiary.accountNumber} · {vendorBeneficiary.ifsc}
                    </p>
                  </div>
                  <BeneficiaryStatusBadge
                    status={vendorBeneficiary.status}
                    availableAt={vendorBeneficiary.availableAt}
                  />
                </div>
              ) : (
                <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                  <p className="text-red-800">No registered beneficiary for this vendor.</p>
                  {onRegisterBeneficiary && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => onRegisterBeneficiary(selectedInvoices[0])}
                    >
                      Register Beneficiary
                    </Button>
                  )}
                </div>
              )}
              {vendorBeneficiary && !beneSelectable && (
                <p className="text-xs text-amber-700 mt-1">
                  Beneficiary is still activating and cannot be selected for payout yet.
                </p>
              )}
            </div>

            <div>
              <Label>Payment Mode *</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {cutoffNotice && (
                <p className="text-xs text-muted-foreground mt-1">{cutoffNotice}</p>
              )}
            </div>

            <div>
              <Label>Sender Account</Label>
              <Input
                value={
                  linkedAccount
                    ? `${linkedAccount.bank || "ICICI"} · ${linkedAccount.accountNumber || ""}`
                    : "—"
                }
                disabled
              />
            </div>

            <div>
              <Label>Amount</Label>
              <Input value={formatCurrency(totalAmount, "INR")} disabled />
              {!amountValidation.valid && (
                <p className="text-xs text-red-600 mt-1">{amountValidation.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="payout-remarks">Remarks / Narration *</Label>
              <Textarea
                id="payout-remarks"
                value={remarks}
                onChange={(e) => setRemarks(sanitizeRemarks(e.target.value))}
                placeholder="Payment narration (no special characters)"
                rows={2}
              />
            </div>

            <div>
              <Label>Transaction Reference</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input value={clientReference} disabled className="font-mono text-xs" />
                </TooltipTrigger>
                <TooltipContent>Unique reference for reconciliation — auto-generated</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <p className="font-medium text-base">Review before releasing funds</p>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Beneficiary</span>
                <span className="font-medium text-right">
                  {vendorBeneficiary?.name || vendorName}
                  <br />
                  <span className="text-xs font-normal">{vendorBeneficiary?.accountNumber}</span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode</span>
                <span>{mode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatCurrency(totalAmount, "INR")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sender</span>
                <span>{linkedAccount?.accountNumber || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{clientReference}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-2 border-t">
              This will initiate a real money transfer via ICICI. Confirm only when details are correct.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "form" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={!canProceed}>
                Review & Confirm
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep("form")} disabled={submitting}>
                Back
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const result = await executePayout();
                    if (result) handleResultClose(result);
                  } catch {
                    // parent handles toast
                  }
                }}
                disabled={submitting}
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm & Release
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IciciPayoutDialog;
