import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Lock } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../utils";
import {
  orderStatusColors,
  paymentStatusColors,
  deliveryStatusLabel,
  deliveryStatusColors,
  FUNDING_STATUS_OPTIONS,
  fundingStatusColors,
} from "../constants";
import OrderTrackingDocumentChainSection from "./OrderTrackingDocumentChainSection";
import OrderTrackingPaymentObligationsTable from "./OrderTrackingPaymentObligationsTable";
import OrderTrackingChecklistSection from "./OrderTrackingChecklistSection";
import OrderTrackingFundingSection from "./OrderTrackingFundingSection";
import OrderTrackingRemarksSection from "./OrderTrackingRemarksSection";

// `value` is sometimes a Badge (renders a <div>) — a <p> can't legally
// contain block-level content, so the value wrapper stays a <div>.
const Stat = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="text-sm font-semibold text-foreground">{value}</div>
  </div>
);

const Section = ({ title, children }) => (
  <div>
    <h4 className="mb-2 text-sm font-semibold text-foreground">{title}</h4>
    {children}
  </div>
);

/**
 * Right-hand slide-over opened via the grid's View action (spec §12).
 */
const OrderTrackingDetailDrawer = ({
  open,
  onOpenChange,
  detail,
  isLoading,
  onOpenDocument,
  onCloseOrder,
  onAddRemark,
  onSaveInternalChecklist,
  canManageOrder = false,
  closingOrder = false,
  addingRemark = false,
  savingInternalChecklist = false,
  canUseGrn = true,
  canUsePi = true,
  canUseTi = true,
}) => {
  const isFullySettled =
    detail &&
    Number(detail.amountOutstanding || 0) <= 0 &&
    (detail.paymentStatus === "Fully Paid" ||
      detail.isFullySettled ||
      detail.settlementStatus === "FULLY_SETTLED");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full overflow-y-auto sm:max-w-lg"
        data-testid="order-tracking-detail-drawer"
      >
        <SheetHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <SheetTitle>Order Details</SheetTitle>
        </SheetHeader>

        {isLoading || !detail ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Loading order details...
          </p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-base font-semibold text-foreground">
                    {detail.poNumber || detail.orderNumber}
                  </p>
                  <Badge
                    variant="outline"
                    className={`border-0 font-semibold ${orderStatusColors[detail.orderStatus] || ""}`}
                  >
                    {detail.orderStatus}
                  </Badge>
                </div>
                {detail && canManageOrder && detail.orderStatus === "OPEN" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCloseOrder?.(detail)}
                    disabled={closingOrder}
                    className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/50"
                    data-testid="close-order-btn"
                  >
                    <Lock className="mr-1.5 h-3.5 w-3.5" />
                    Close Order
                  </Button>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {detail.vendor.name}
              </p>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-3">
                <Stat
                  label="Order Value"
                  value={formatCurrency(detail.orderValue, detail.currency)}
                />
                <Stat
                  label="Outstanding"
                  value={formatCurrency(
                    detail.amountOutstanding,
                    detail.currency,
                  )}
                />
                {/* <Stat
                  label="Settlement"
                  value={
                    <Badge variant="outline" className={`border-0 font-semibold ${isFullySettled ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                      {isFullySettled ? "Fully Settled" : "Partially Settled"}
                    </Badge>
                  }
                /> */}
                <Stat
                  label="Payment Status"
                  value={
                    <Badge
                      variant="outline"
                      className={`border-0 font-semibold ${paymentStatusColors[detail.paymentStatus] || ""}`}
                    >
                      {detail.paymentStatus || "-"}
                    </Badge>
                  }
                />
                <Stat
                  label="Funding"
                  value={
                    <Badge
                      variant="outline"
                      className={`border-0 font-semibold ${fundingStatusColors[detail.funding.status] || ""}`}
                    >
                      {FUNDING_STATUS_OPTIONS.find(
                        (option) => option.value === detail.funding.status,
                      )?.label || detail.funding.status}
                    </Badge>
                  }
                />
                <Stat
                  label="Checklist"
                  value={`${detail.checklist.completeCount}/${detail.checklist.totalCount}`}
                />
                <Stat label="Order Date" value={formatDate(detail.orderDate)} />
              </div>
            </div>

            <Section title="Document Chain">
              <OrderTrackingDocumentChainSection
                documentChain={detail.documentChain}
                currency={detail.currency}
                onOpenDocument={onOpenDocument}
                canUseGrn={canUseGrn}
                canUsePi={canUsePi}
                canUseTi={canUseTi}
              />
            </Section>

            <Section title="Payment Obligations">
              <OrderTrackingPaymentObligationsTable
                obligations={detail.paymentObligations}
                currency={detail.currency}
              />
            </Section>

            <Section title="Vendor">
              <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-2.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="font-medium">{detail.vendor.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">GSTIN</p>
                  <p className="font-medium">{detail.vendor.gstin || "-"}</p>
                </div>
                {detail.vendor.isMsme ? (
                  <Badge
                    variant="outline"
                    className="col-span-2 w-fit border-0 bg-purple-100 font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                  >
                    MSME
                  </Badge>
                ) : null}
              </div>
            </Section>

            <Section title="Internal Checklist">
              <OrderTrackingChecklistSection
                checklist={detail.checklist}
                onSave={(nextChecklist) => onSaveInternalChecklist?.(detail, nextChecklist)}
                isSaving={savingInternalChecklist}
              />
            </Section>

            <Section title="Delivery">
              <div className="space-y-1.5 rounded-md border border-border p-2.5 text-sm">
                <Badge
                  variant="outline"
                  className={`border-0 font-semibold ${detail.delivery.status ? deliveryStatusColors[detail.delivery.status] || "" : "bg-muted text-muted-foreground"}`}
                >
                  {deliveryStatusLabel(detail.delivery.status)}
                </Badge>
                {detail.delivery.remarks ? (
                  <p className="text-muted-foreground">
                    {detail.delivery.remarks}
                  </p>
                ) : null}
                {detail.delivery.updatedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDate(detail.delivery.updatedAt)}
                    {detail.delivery.updatedBy?.name
                      ? ` by ${detail.delivery.updatedBy.name}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </Section>

            <Section title="Funding">
              <OrderTrackingFundingSection
                funding={detail.funding}
                currency={detail.currency}
              />
            </Section>

            <Section title="Remarks">
              <OrderTrackingRemarksSection
                remarks={detail.remarksHistory}
                onAddRemark={(remark) => onAddRemark?.(detail, remark)}
                isAdding={addingRemark}
              />
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OrderTrackingDetailDrawer;
