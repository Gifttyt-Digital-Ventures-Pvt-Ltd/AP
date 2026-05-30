import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Separator } from "../../../components/ui/separator";
import {
  getConditionVisibility,
  getWorkflowTypeLabel,
  WORKFLOW_TYPE_BADGE_CLASSES,
} from "../constants/approvalWorkflowConfig";
import { formatCurrency } from "../../../utils/currency";

const DetailField = ({ label, children }) => (
  <div className="space-y-1.5">
    <Label className="text-muted-foreground">{label}</Label>
    <div className="text-sm">{children}</div>
  </div>
);

const NameList = ({ names = [], emptyLabel = "None selected" }) => {
  if (!names.length) {
    return <p className="text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {names.map((name) => (
        <Badge key={name} variant="secondary">
          {name}
        </Badge>
      ))}
    </div>
  );
};

const WorkflowViewDialog = ({
  open,
  onOpenChange,
  rule,
  categoryEnabled = true,
  canManageWorkflow = false,
  onEdit,
}) => {
  if (!rule) return null;

  const visibility = getConditionVisibility(rule.type);
  const vendorNames = Array.isArray(rule.vendorNames) ? rule.vendorNames : [];
  const departmentNames = Array.isArray(rule.departmentNames) ? rule.departmentNames : [];
  const categoryNames = Array.isArray(rule.categoryNames) ? rule.categoryNames : [];
  const approvers = Array.isArray(rule.approvers) ? rule.approvers : [];
  const ruleCurrency = rule.currency || "INR";
  const isGeneric = rule.type === "GENERIC";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Workflow Details</DialogTitle>
          <DialogDescription>
            View complete information about this approval workflow rule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailField label="Workflow Name">
              <p className="font-medium">{rule.name || "-"}</p>
            </DetailField>

            <DetailField label="Status">
              <Badge
                variant="outline"
                className={
                  rule.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }
              >
                {rule.isActive ? "Active" : "Inactive"}
              </Badge>
            </DetailField>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DetailField label="Workflow Type">
              <Badge
                variant="outline"
                className={`border ${WORKFLOW_TYPE_BADGE_CLASSES[rule.type] || "bg-gray-100 text-gray-800 border-gray-200"}`}
              >
                {getWorkflowTypeLabel(rule.type)}
              </Badge>
            </DetailField>

            <DetailField label="Approval Mode">
              <Badge
                variant="outline"
                className={
                  rule.approvalMode === "sequential"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }
              >
                {rule.approvalMode === "sequential" ? "Sequential" : "Parallel"}
              </Badge>
            </DetailField>

            <DetailField label="Currency">
              <Badge variant="secondary">{rule.currency || "INR"}</Badge>
            </DetailField>
          </div>

          <Separator />

          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Conditions</p>

            {isGeneric ? (
              <p className="text-sm text-muted-foreground">All invoices (catch-all fallback rule)</p>
            ) : (
              <div className="space-y-4">
                {visibility?.showVendor && (
                  <DetailField label="Vendors">
                    <NameList names={vendorNames} />
                  </DetailField>
                )}

                {visibility?.showDept && (
                  <DetailField label="Departments">
                    <NameList names={departmentNames} />
                  </DetailField>
                )}

                {categoryEnabled && visibility?.showCategory && (
                  <DetailField label="Categories">
                    <NameList names={categoryNames} />
                  </DetailField>
                )}

                {visibility?.showAmount && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <DetailField label="Min Amount">
                      <p>
                        {rule.minAmount !== null && rule.minAmount !== undefined
                          ? formatCurrency(rule.minAmount, ruleCurrency)
                          : "No minimum"}
                      </p>
                    </DetailField>
                    <DetailField label="Max Amount">
                      <p>
                        {rule.maxAmount !== null && rule.maxAmount !== undefined
                          ? formatCurrency(rule.maxAmount, ruleCurrency)
                          : "No maximum"}
                      </p>
                    </DetailField>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Approvers</Label>
              <Badge variant="outline">
                {approvers.length} approver{approvers.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {approvers.length > 0 ? (
              <div className="space-y-2">
                {approvers.map((approver, index) => (
                  <div
                    key={approver.id || `${approver.userId}-${index}`}
                    className="flex items-center gap-3 rounded-md border bg-background p-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {approver.userName || "Unnamed approver"}
                      </p>
                      {approver.userId ? (
                        <p className="truncate text-xs text-muted-foreground">
                          ID: {approver.userId}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                No approvers assigned.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canManageWorkflow && onEdit ? (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEdit(rule);
              }}
            >
              Edit Workflow
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkflowViewDialog;
