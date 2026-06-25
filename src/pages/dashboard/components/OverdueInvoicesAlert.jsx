import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { AlertTriangle, ArrowRight } from "lucide-react";

const OverdueInvoicesAlert = ({
  overdueInvoices = [],
  overdueSummary = null,
  formatFullCurrency,
}) => {
  const navigate = useNavigate();

  const count = overdueSummary?.count ?? overdueInvoices.length;
  if (!count || overdueInvoices.length === 0) return null;

  const totalAmount =
    overdueSummary?.total_amount ??
    overdueSummary?.totalAmount ??
    overdueInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount ?? 0),
      0,
    );

  return (
    <Card
      className="border-red-200 bg-red-50/50 shadow-sm cursor-pointer hover:bg-red-50/80 transition-colors"
      data-testid="overdue-invoices-alert"
      onClick={() => navigate("/payments")}
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-red-100 p-2 shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-red-900/80">Overdue Invoices</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0">
              <p className="text-2xl font-bold text-red-700 leading-none" data-testid="overdue-invoices-count">
                {count}
              </p>
              {totalAmount > 0 ? (
                <p className="text-sm font-semibold text-red-800/90">
                  {formatFullCurrency(totalAmount)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-xs text-red-800 hover:bg-red-100/80 hover:text-red-900"
          onClick={(event) => {
            event.stopPropagation();
            navigate("/payments");
          }}
          data-testid="overdue-invoices-view-all"
        >
          View <ArrowRight className="h-3 w-3 ml-0.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default OverdueInvoicesAlert;
