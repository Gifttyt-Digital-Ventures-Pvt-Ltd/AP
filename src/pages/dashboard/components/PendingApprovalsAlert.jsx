import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Bell, ArrowRight } from "lucide-react";

const PendingApprovalsAlert = ({
  pendingApprovals = [],
  formatFullCurrency,
}) => {
  const navigate = useNavigate();

  if (pendingApprovals.length === 0) return null;

  const count = pendingApprovals.length;
  const totalAmount = pendingApprovals.reduce(
    (sum, invoice) => sum + Number(invoice.amount ?? 0),
    0,
  );

  return (
    <Card
      className="border-yellow-200 bg-yellow-50/50 shadow-sm cursor-pointer hover:bg-yellow-50/80 transition-colors"
      onClick={() => navigate("/approvals")}
    >
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-yellow-100 p-2 shrink-0">
            <Bell className="h-4 w-4 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-yellow-900/80">Pending Your Approval</p>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0">
              <p className="text-2xl font-bold text-yellow-700 leading-none">
                {count}
              </p>
              {totalAmount > 0 ? (
                <p className="text-sm font-semibold text-yellow-900/90">
                  {formatFullCurrency(totalAmount)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-xs text-yellow-900 hover:bg-yellow-100/80"
          onClick={(event) => {
            event.stopPropagation();
            navigate("/approvals");
          }}
        >
          Review <ArrowRight className="h-3 w-3 ml-0.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default PendingApprovalsAlert;
