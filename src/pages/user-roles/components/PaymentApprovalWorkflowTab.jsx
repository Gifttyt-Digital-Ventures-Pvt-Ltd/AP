import React, { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Checkbox } from "../../../components/ui/checkbox";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import CurrencySelector from "../../../components/common/CurrencySelector";
import { useCurrencyFilter } from "../../../hooks/useCurrencyFilter";
import {
  CURRENCY_FILTER_ALL,
  CURRENCY_SCREENS,
  DEFAULT_CURRENCY,
  formatCurrency,
} from "../../../utils/currency";
import {
  useCreatePaymentApprovalWorkflowMutation,
  useDeletePaymentApprovalWorkflowMutation,
  useGetPaymentApprovalWorkflowsQuery,
  useGetPaymentWorkflowAdminsQuery,
  useGetPaymentWorkflowApproversQuery,
  useSwitchPaymentApprovalWorkflowMutation,
  useUpdatePaymentApprovalWorkflowMutation,
} from "../../../Services/apis/paymentApprovalWorkflowApi";
import {
  findOverlappingPaymentRule,
  getConditionSummary,
  isPaymentWorkflowType,
} from "../utils/approvalWorkflowUtils";

const PAYMENT_WORKFLOW_TYPE = "PAYMENT_AMOUNT";
const GENERIC_ADMIN_WORKFLOW_ID = 9000;
const GENERIC_ADMIN_WORKFLOW_NAME = "Generic Admin Approval";
const MAX_PAYMENT_WORKFLOW_APPROVERS = 3;
// TODO(payment-workflow-api): remove this flag and local fallback arrays after backend
// endpoints provide workflows, admins, and approvers end to end.
const ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA = false;

const LOCAL_PAYMENT_WORKFLOW_ADMINS = [
  { id: "100", employeeId: 100, name: "Admin / Master Admin", email: "admin@optifii.test" },
  { id: "101", employeeId: 101, name: "Ananya Rao", email: "ananya.rao@optifii.test" },
  { id: "102", employeeId: 102, name: "Rohan Mehta", email: "rohan.mehta@optifii.test" },
];

const LOCAL_PAYMENT_WORKFLOW_APPROVERS = [
  { id: "201", employeeId: 201, name: "Priya Shah", email: "priya.shah@optifii.test" },
  { id: "202", employeeId: 202, name: "Karan Iyer", email: "karan.iyer@optifii.test" },
  { id: "203", employeeId: 203, name: "Meera Nair", email: "meera.nair@optifii.test" },
];

const LOCAL_PAYMENT_WORKFLOWS = [
  {
    workflowId: GENERIC_ADMIN_WORKFLOW_ID,
    name: GENERIC_ADMIN_WORKFLOW_NAME,
    workflowType: PAYMENT_WORKFLOW_TYPE,
    minAmount: 0,
    maxAmount: null,
    currency: DEFAULT_CURRENCY,
    isSequential: false,
    isActive: true,
    paymentAdminId: 100,
    paymentAdminName: "Admin / Master Admin",
    approvers: [],
  },
  {
    workflowId: 9001,
    name: "Payments up to 5L",
    workflowType: PAYMENT_WORKFLOW_TYPE,
    minAmount: 0,
    maxAmount: 500000,
    currency: DEFAULT_CURRENCY,
    isSequential: false,
    isActive: false,
    paymentAdminId: 101,
    paymentAdminName: "Ananya Rao",
    approvers: [{ approverId: 201, approverName: "Priya Shah", level: 1 }],
  },
  {
    workflowId: 9002,
    name: "Payments 5L to 25L",
    workflowType: PAYMENT_WORKFLOW_TYPE,
    minAmount: 500001,
    maxAmount: 2500000,
    currency: DEFAULT_CURRENCY,
    isSequential: true,
    isActive: false,
    paymentAdminId: 102,
    paymentAdminName: "Rohan Mehta",
    approvers: [
      { approverId: 202, approverName: "Karan Iyer", level: 1 },
      { approverId: 203, approverName: "Meera Nair", level: 2 },
    ],
  },
];

const emptyFormState = {
  id: "",
  workflowId: null,
  name: "",
  minAmount: "",
  maxAmount: "",
  currency: DEFAULT_CURRENCY,
  paymentAdminId: "",
  paymentAdminName: "",
  approvers: [{ userId: "", userName: "" }],
  isSequential: false,
};

const toStringId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const asNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeApprovers = (items = []) =>
  toArray(items)
    .map((item, index) => {
      const userId = toStringId(
        item?.approverId ?? item?.employeeId ?? item?.userId ?? item?.id,
      );
      return {
        id: `${userId || "approver"}-${index}`,
        userId,
        userName: String(
          item?.approverName || item?.name || item?.userName || "",
        ).trim(),
        approvalOrder: asNumberOrNull(item?.level ?? item?.approvalOrder) || index + 1,
      };
    })
    .filter((approver) => approver.userId)
    .sort((left, right) => left.approvalOrder - right.approvalOrder);

const selectedApproverName = (approvers = [], approverId) => {
  const selected = approvers.find(
    (approver) => String(approver.id) === String(approverId),
  );
  return selected?.name || "";
};

const mapWorkflowToPaymentRule = (workflow = {}) => ({
  id: toStringId(workflow.workflowId),
  workflowId: asNumberOrNull(workflow.workflowId),
  name: String(workflow.name || "").trim(),
  type: String(workflow.workflowType || PAYMENT_WORKFLOW_TYPE).trim(),
  minAmount: asNumberOrNull(workflow.minAmount),
  maxAmount: asNumberOrNull(workflow.maxAmount),
  currency: String(workflow.currency || DEFAULT_CURRENCY).trim().toUpperCase(),
  paymentAdminId: toStringId(workflow.paymentAdminId),
  paymentAdminName: String(workflow.paymentAdminName || "").trim(),
  approvers: normalizeApprovers(workflow.approvers),
  approvalMode: workflow.isSequential ? "sequential" : "parallel",
  isActive: workflow.isActive === true,
});

const isGenericAdminWorkflowRule = (rule = {}) =>
  String(rule.workflowId || rule.id) === String(GENERIC_ADMIN_WORKFLOW_ID) ||
  String(rule.name || "").trim() === GENERIC_ADMIN_WORKFLOW_NAME;

const sortPaymentWorkflowRules = (items = []) =>
  [...items].sort((left, right) => {
    const leftGeneric = isGenericAdminWorkflowRule(left);
    const rightGeneric = isGenericAdminWorkflowRule(right);
    if (leftGeneric && !rightGeneric) return 1;
    if (!leftGeneric && rightGeneric) return -1;
    const minDiff = Number(left.minAmount || 0) - Number(right.minAmount || 0);
    if (minDiff !== 0) return minDiff;
    return String(left.name || "").localeCompare(String(right.name || ""));
  });

const getErrorMessage = (error, fallbackMessage) =>
  error?.data?.detail || error?.data?.message || error?.error || fallbackMessage;

const PaymentWorkflowDetailsDialog = ({ open, onOpenChange, rule }) => {
  if (!rule) return null;

  const isGenericRule = isGenericAdminWorkflowRule(rule);
  const rangeLabel = isGenericRule
    ? null
    : `${formatCurrency(rule.minAmount || 0, rule.currency)} to ${
        rule.maxAmount === null || rule.maxAmount === undefined
          ? "No limit"
          : formatCurrency(rule.maxAmount, rule.currency)
      }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payment Workflow Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Payment Amount</Badge>
              {isGenericRule && <Badge variant="secondary">System Catch-all</Badge>}
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
              {rule.approvers.length > 1 && (
                <Badge variant="secondary">
                  {rule.approvalMode === "sequential" ? "Sequential" : "Parallel"}
                </Badge>
              )}
              {isGenericRule && <Badge variant="outline">Locked</Badge>}
            </div>
            <h4 className="text-lg font-semibold">{rule.name}</h4>
            <p className="text-sm text-muted-foreground">
              {isGenericRule
                ? "Captures payruns that do not match any specific payment workflow rule."
                : "Routes payruns matching this absolute amount range."}
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Workflow ID:</span>{" "}
              {rule.workflowId || rule.id || "-"}
            </div>
            <div>
              <span className="text-muted-foreground">Currency:</span>{" "}
              {rule.currency || DEFAULT_CURRENCY}
            </div>
            {!isGenericRule && (
              <div>
                <span className="text-muted-foreground">Amount Range:</span>{" "}
                {rangeLabel}
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Approval Mode:</span>{" "}
              {rule.approvers.length > 1
                ? rule.approvalMode === "sequential"
                  ? "Sequential"
                  : "Parallel"
                : "Single owner"}
            </div>
            <div>
              <span className="text-muted-foreground">Admin:</span>{" "}
              {rule.paymentAdminName || rule.paymentAdminId || "-"}
            </div>
            <div>
              <span className="text-muted-foreground">System Rule:</span>{" "}
              {isGenericRule ? "Yes" : "No"}
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="border-b bg-muted px-4 py-3">
              <h4 className="font-semibold">Approvers</h4>
            </div>
            <div className="divide-y">
              {rule.approvers.length > 0 ? (
                rule.approvers.map((approver, index) => (
                  <div
                    key={approver.id || `${approver.userId}-${index}`}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{approver.userName || approver.userId}</p>
                      <p className="text-xs text-muted-foreground">
                        Level {approver.approvalOrder || index + 1}
                      </p>
                    </div>
                    <Badge variant="outline">Payment Approver</Badge>
                  </div>
                ))
              ) : (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  {isGenericRule
                    ? "No approvers. Admin / Master Admin handles unmatched payruns."
                    : "No approvers. Payment Admin approval applies."}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PaymentApprovalWorkflowTab = ({ canManageWorkflow = false }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsRule, setDetailsRule] = useState(null);
  const [formState, setFormState] = useState(emptyFormState);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState(null);
  const [localRules, setLocalRules] = useState(LOCAL_PAYMENT_WORKFLOWS);

  const {
    currencies: filterCurrencies,
    selectedCurrency: listCurrency,
    setSelectedCurrency: setListCurrency,
    queryArgs,
  } = useCurrencyFilter(CURRENCY_SCREENS.WORKFLOW);

  const ruleCurrencies = useMemo(
    () => filterCurrencies.filter((currency) => currency !== CURRENCY_FILTER_ALL),
    [filterCurrencies],
  );

  const {
    data: paymentWorkflowData = [],
    isLoading,
    isFetching,
    isError: workflowsError,
    refetch,
  } = useGetPaymentApprovalWorkflowsQuery(queryArgs, {
    skip: ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA,
  });
  const {
    data: paymentAdminsData = [],
    isLoading: adminsLoading,
    isError: adminsError,
  } = useGetPaymentWorkflowAdminsQuery(undefined, {
    skip: ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA,
  });
  const {
    data: paymentApproversData = [],
    isLoading: approversLoading,
    isError: approversError,
  } = useGetPaymentWorkflowApproversQuery(undefined, {
    skip: ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA,
  });

  const [createWorkflow, { isLoading: creating }] =
    useCreatePaymentApprovalWorkflowMutation();
  const [updateWorkflow, { isLoading: updating }] =
    useUpdatePaymentApprovalWorkflowMutation();
  const [switchWorkflow, { isLoading: switching }] =
    useSwitchPaymentApprovalWorkflowMutation();
  const [deleteWorkflow, { isLoading: deleting }] =
    useDeletePaymentApprovalWorkflowMutation();
  const actionLoading = creating || updating || switching || deleting;

  const paymentAdmins = useMemo(
    () =>
      ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA
        ? LOCAL_PAYMENT_WORKFLOW_ADMINS
        : paymentAdminsData,
    [paymentAdminsData],
  );

  const paymentApprovers = useMemo(
    () =>
      ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA
        ? LOCAL_PAYMENT_WORKFLOW_APPROVERS
        : paymentApproversData,
    [paymentApproversData],
  );

  const rules = useMemo(() => {
    const sourceRules = ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA
      ? localRules
      : paymentWorkflowData;
    return sortPaymentWorkflowRules(sourceRules
      .map(mapWorkflowToPaymentRule)
      .filter((rule) => isPaymentWorkflowType(rule.type))
      .filter(
        (rule) =>
          listCurrency === CURRENCY_FILTER_ALL || rule.currency === listCurrency,
      ));
  }, [localRules, listCurrency, paymentWorkflowData]);

  const openCreateModal = () => {
    setFormState(emptyFormState);
    setModalOpen(true);
  };

  const openDetailsModal = (rule) => {
    setDetailsRule(rule);
    setDetailsDialogOpen(true);
  };

  const closeDetailsModal = (open) => {
    setDetailsDialogOpen(open);
    if (!open) setDetailsRule(null);
  };

  const openEditModal = (rule) => {
    if (isGenericAdminWorkflowRule(rule)) {
      toast.info("Generic Admin Approval is a system fallback and cannot be modified");
      return;
    }
    setFormState({
      id: rule.id,
      workflowId: rule.workflowId,
      name: rule.name,
      minAmount: rule.minAmount !== null ? String(rule.minAmount) : "",
      maxAmount: rule.maxAmount !== null ? String(rule.maxAmount) : "",
      currency: rule.currency || DEFAULT_CURRENCY,
      paymentAdminId: rule.paymentAdminId || "",
      paymentAdminName: rule.paymentAdminName || "",
      approvers:
        rule.approvers.length > 0
          ? rule.approvers.map((approver) => ({
              userId: approver.userId,
              userName: approver.userName,
            }))
          : [{ userId: "", userName: "" }],
      isSequential: rule.approvalMode === "sequential",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormState(emptyFormState);
  };

  const updatePaymentAdmin = (userId) => {
    const selectedUser = paymentAdmins.find((user) => user.id === userId);
    setFormState((prev) => ({
      ...prev,
      paymentAdminId: userId,
      paymentAdminName: selectedUser?.name || "",
    }));
  };

  const updateApprover = (index, userId) => {
    setFormState((prev) => {
      if (
        userId &&
        prev.approvers.some(
          (approver, approverIndex) =>
            approverIndex !== index && approver.userId === userId,
        )
      ) {
        toast.error("This payment approver is already selected");
        return prev;
      }

      const selectedUser = paymentApprovers.find((user) => user.id === userId);
      const nextApprovers = [...prev.approvers];
      nextApprovers[index] = {
        userId,
        userName: selectedUser?.name || "",
      };
      return { ...prev, approvers: nextApprovers };
    });
  };

  const addApprover = () => {
    setFormState((prev) => ({
      ...prev,
      approvers:
        prev.approvers.length >= MAX_PAYMENT_WORKFLOW_APPROVERS
          ? prev.approvers
          : [...prev.approvers, { userId: "", userName: "" }],
    }));
  };

  const removeApprover = (index) => {
    setFormState((prev) => {
      const approvers = prev.approvers.filter((_, idx) => idx !== index);
      return {
        ...prev,
        approvers: approvers.length > 0 ? approvers : [{ userId: "", userName: "" }],
        isSequential: approvers.length > 1 ? prev.isSequential : false,
      };
    });
  };

  const validateForm = () => {
    if (!formState.name.trim()) {
      toast.error("Workflow name is required");
      return false;
    }
    if (!formState.paymentAdminId) {
      toast.error("Please select one Payment Admin");
      return false;
    }

    const minAmount = asNumberOrNull(formState.minAmount);
    const maxAmount = asNumberOrNull(formState.maxAmount);
    if (minAmount === null) {
      toast.error("Payment workflow requires a min amount");
      return false;
    }
    if (minAmount < 0 || (maxAmount !== null && maxAmount < 0)) {
      toast.error("Amount range cannot be negative");
      return false;
    }
    if (maxAmount !== null && minAmount > maxAmount) {
      toast.error("Min amount cannot be greater than max amount");
      return false;
    }

    const selectedApprovers = formState.approvers.filter((approver) => approver.userId);
    if (selectedApprovers.length > MAX_PAYMENT_WORKFLOW_APPROVERS) {
      toast.error(`Maximum ${MAX_PAYMENT_WORKFLOW_APPROVERS} payment approvers allowed`);
      return false;
    }
    const selectedIds = selectedApprovers.map((approver) => approver.userId);
    if (new Set(selectedIds).size !== selectedIds.length) {
      toast.error("Duplicate payment approvers are not allowed");
      return false;
    }

    const overlappingRule = findOverlappingPaymentRule(
      rules.filter((rule) => !isGenericAdminWorkflowRule(rule)),
      {
        type: PAYMENT_WORKFLOW_TYPE,
        currency: formState.currency,
        minAmount,
        maxAmount,
      },
      formState.id,
    );
    if (overlappingRule) {
      toast.error(`Payment amount range overlaps with "${overlappingRule.name}"`);
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const selectedApprovers = formState.approvers.filter((approver) => approver.userId);
    const approvers = selectedApprovers.map((approver, index) => ({
      approverId: asNumberOrNull(approver.userId),
      level: index + 1,
    }));
    const minAmount = asNumberOrNull(formState.minAmount);
    const maxAmount = asNumberOrNull(formState.maxAmount);
    const paymentAdminId = asNumberOrNull(formState.paymentAdminId);

    return {
      workflowName: formState.name.trim(),
      workflowType: PAYMENT_WORKFLOW_TYPE,
      currency: formState.currency || DEFAULT_CURRENCY,
      minAmount,
      maxAmount,
      paymentAdminId,
      paymentAdminName: formState.paymentAdminName || undefined,
      approvers,
      isSequential: formState.isSequential && selectedApprovers.length > 1,
      isActive: true,
    };
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canManageWorkflow) {
      toast.error("You do not have permission to modify payment workflows");
      return;
    }
    if (!validateForm()) return;

    try {
      const payload = buildPayload();
      if (ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA) {
        if (!formState.workflowId) {
          const workflowId = Date.now();
          setLocalRules((prev) => [
            ...prev,
            {
              workflowId,
              name: payload.workflowName,
              workflowType: payload.workflowType,
              minAmount: payload.minAmount,
              maxAmount: payload.maxAmount,
              currency: payload.currency,
              paymentAdminId: payload.paymentAdminId,
              paymentAdminName: payload.paymentAdminName,
              approvers: payload.approvers.map((approver, index) => ({
                ...approver,
                approverName:
                  selectedApproverName(paymentApprovers, approver.approverId) ||
                  `Approver ${index + 1}`,
              })),
              isSequential: payload.isSequential,
              isActive: true,
            },
          ]);
          toast.success("Payment approval workflow created");
        } else {
          setLocalRules((prev) =>
            prev.map((rule) =>
              Number(rule.workflowId) === Number(formState.workflowId)
                ? {
                    ...rule,
                    name: payload.workflowName,
                    minAmount: payload.minAmount,
                    maxAmount: payload.maxAmount,
                    currency: payload.currency,
                    paymentAdminId: payload.paymentAdminId,
                    paymentAdminName: payload.paymentAdminName,
                    approvers: payload.approvers.map((approver, index) => ({
                      ...approver,
                      approverName:
                        selectedApproverName(paymentApprovers, approver.approverId) ||
                        `Approver ${index + 1}`,
                    })),
                    isSequential: payload.isSequential,
                  }
                : rule,
            ),
          );
          toast.success("Payment approval workflow updated");
        }
        closeModal();
        return;
      }

      if (!formState.workflowId) {
        await createWorkflow(payload).unwrap();
        toast.success("Payment approval workflow created");
      } else {
        await updateWorkflow({
          workflowId: formState.workflowId,
          ...payload,
        }).unwrap();
        toast.success("Payment approval workflow updated");
      }
      closeModal();
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save payment workflow"));
    }
  };

  const toggleRule = async (rule) => {
    if (!canManageWorkflow) return;
    if (isGenericAdminWorkflowRule(rule)) {
      toast.info("Generic Admin Approval is always active");
      return;
    }
    if (!rule.isActive) {
      const overlappingRule = findOverlappingPaymentRule(
        rules.filter((item) => !isGenericAdminWorkflowRule(item)),
        {
          type: PAYMENT_WORKFLOW_TYPE,
          currency: rule.currency,
          minAmount: rule.minAmount,
          maxAmount: rule.maxAmount,
        },
        rule.id,
      );
      if (overlappingRule) {
        toast.error(`Payment amount range overlaps with "${overlappingRule.name}"`);
        return;
      }
    }
    if (ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA) {
      setLocalRules((prev) =>
        prev.map((item) =>
          Number(item.workflowId) === Number(rule.workflowId)
            ? { ...item, isActive: !rule.isActive }
            : item,
        ),
      );
      toast.success(`Payment workflow ${rule.isActive ? "disabled" : "enabled"}`);
      return;
    }

    try {
      await switchWorkflow({
        workflowId: rule.workflowId,
        isActive: !rule.isActive,
      }).unwrap();
      toast.success(`Payment workflow ${rule.isActive ? "disabled" : "enabled"}`);
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update payment workflow"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteRuleTarget) return;
    if (isGenericAdminWorkflowRule(deleteRuleTarget)) {
      toast.info("Generic Admin Approval is a system fallback and cannot be deleted");
      setDeleteRuleTarget(null);
      return;
    }
    if (ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA) {
      setLocalRules((prev) =>
        prev.filter(
          (rule) => Number(rule.workflowId) !== Number(deleteRuleTarget.workflowId),
        ),
      );
      toast.success("Payment approval workflow deleted");
      setDeleteRuleTarget(null);
      return;
    }

    try {
      await deleteWorkflow({ workflowId: deleteRuleTarget.workflowId }).unwrap();
      toast.success("Payment approval workflow deleted");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete payment workflow"));
    } finally {
      setDeleteRuleTarget(null);
    }
  };

  if (isLoading || adminsLoading || approversLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Payment Approval Workflows</h3>
          <p className="text-sm text-muted-foreground">
            Manage absolute payment amount ranges ({rules.length} rules)
            {isFetching ? " · refreshing..." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CurrencySelector
            currencies={filterCurrencies}
            value={listCurrency}
            onChange={setListCurrency}
            variant="inline"
            id="payment-workflow-currency-filter"
          />
          {canManageWorkflow && (
            <Button onClick={openCreateModal} disabled={actionLoading}>
              <Plus className="mr-2 h-4 w-4" />
              New Payment Workflow
            </Button>
          )}
        </div>
      </div>

      {!canManageWorkflow && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          You have read-only access to payment approval workflows.
        </div>
      )}

      {!ENABLE_LOCAL_PAYMENT_WORKFLOW_DATA &&
        (workflowsError || adminsError || approversError) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Payment workflow data could not be loaded from backend.
        </div>
        )}

      <Card>
        <CardContent className="space-y-2 pt-4">
          {rules.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No payment approval workflows found yet.
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-md border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => openDetailsModal(rule)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openDetailsModal(rule);
                  }
                }}
              >
                <div className="grid gap-2 md:grid-cols-[minmax(260px,1.25fr)_minmax(180px,0.75fr)_minmax(220px,1fr)_168px] md:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate font-medium">{rule.name}</p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {isGenericAdminWorkflowRule(rule)
                        ? "Captures payruns that do not match specific rules"
                        : getConditionSummary(rule)}
                    </p>
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`min-w-[68px] justify-center ${
                        rule.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-gray-50 text-gray-600"
                      }`}
                    >
                      {rule.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {isGenericAdminWorkflowRule(rule) ? (
                      <Badge variant="secondary" className="min-w-[104px] justify-center">
                        System
                      </Badge>
                    ) : rule.approvers.length > 1 ? (
                      <Badge variant="secondary" className="min-w-[104px] justify-center">
                        {rule.approvalMode === "sequential" ? "Sequential" : "Parallel"}
                      </Badge>
                    ) : (
                      <span className="min-w-[104px]" aria-hidden="true" />
                    )}
                  </div>

                  <div className="min-w-0 text-xs text-muted-foreground">
                    <div className="grid grid-cols-[70px_minmax(0,1fr)]">
                      <span className="font-medium text-foreground">Admin:</span>
                      <span className="truncate">{rule.paymentAdminName || rule.paymentAdminId || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[70px_minmax(0,1fr)]">
                      <span className="font-medium text-foreground">Approvers:</span>
                      <span className="truncate">
                        {rule.approvers.length > 0
                          ? rule.approvers.map((approver) => approver.userName || approver.userId).join(", ")
                          : isGenericAdminWorkflowRule(rule)
                            ? "None"
                            : "None. Payment Admin approval applies."}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-[64px_32px_32px_32px] items-center justify-end gap-1">
                    <div className="flex justify-end">
                      {isGenericAdminWorkflowRule(rule) ? (
                        <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                          Locked
                        </span>
                      ) : (
                        <span className="w-[52px]" aria-hidden="true" />
                      )}
                    </div>
                    <span
                      className="flex justify-center"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRule(rule)}
                        disabled={actionLoading || !canManageWorkflow || isGenericAdminWorkflowRule(rule)}
                        aria-label={rule.isActive ? "Disable payment workflow" : "Enable payment workflow"}
                      />
                    </span>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(rule);
                        }}
                        disabled={actionLoading || !canManageWorkflow || isGenericAdminWorkflowRule(rule)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteRuleTarget(rule);
                        }}
                        disabled={actionLoading || !canManageWorkflow || isGenericAdminWorkflowRule(rule)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <PaymentWorkflowDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={closeDetailsModal}
        rule={detailsRule}
      />

      <Dialog open={modalOpen} onOpenChange={(open) => (!open ? closeModal() : setModalOpen(open))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {formState.workflowId ? "Edit Payment Workflow" : "Create Payment Workflow"}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSave}>
            <div className="space-y-2">
              <Label>Workflow Name</Label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g., Payments 0 to 500000"
                disabled={actionLoading}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CurrencySelector
                currencies={ruleCurrencies}
                value={formState.currency || DEFAULT_CURRENCY}
                onChange={(currency) => setFormState((prev) => ({ ...prev, currency }))}
                disabled={actionLoading}
                label="Currency"
              />
              <div className="space-y-2">
                <Label>Payment Admin</Label>
                <Select
                  value={formState.paymentAdminId || ""}
                  onValueChange={updatePaymentAdmin}
                  disabled={actionLoading || paymentAdmins.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select one payment admin" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentAdmins.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No users with Payments Admin role
                      </div>
                    ) : (
                      paymentAdmins.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Min Amount ({formState.currency || DEFAULT_CURRENCY})</Label>
                <Input
                  type="number"
                  min="0"
                  value={formState.minAmount}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, minAmount: event.target.value }))
                  }
                  placeholder="0"
                  disabled={actionLoading}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Amount ({formState.currency || DEFAULT_CURRENCY})</Label>
                <Input
                  type="number"
                  min="0"
                  value={formState.maxAmount}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, maxAmount: event.target.value }))
                  }
                  placeholder="No limit"
                  disabled={actionLoading}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Payment Approvers (Optional, max {MAX_PAYMENT_WORKFLOW_APPROVERS})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addApprover}
                  disabled={
                    actionLoading ||
                    formState.approvers.length >= MAX_PAYMENT_WORKFLOW_APPROVERS ||
                    formState.approvers.filter((approver) => approver.userId).length >=
                      Math.min(paymentApprovers.length, MAX_PAYMENT_WORKFLOW_APPROVERS)
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Approver
                </Button>
              </div>

              <div className="space-y-2">
                {formState.approvers.map((approver, index) => (
                  <div key={`${approver.userId}-${index}`} className="flex items-center gap-2">
                    <span className="w-6 text-sm text-muted-foreground">{index + 1}.</span>
                    <Select
                      value={approver.userId}
                      onValueChange={(value) => updateApprover(index, value)}
                      disabled={actionLoading || paymentApprovers.length === 0}
                    >
                      <SelectTrigger className="h-10 flex-1">
                        <SelectValue placeholder="Select payment approver" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentApprovers.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No users with Payments Approver role
                          </div>
                        ) : (
                          paymentApprovers.map((user) => {
                            const alreadySelected = formState.approvers.some(
                              (selectedApprover, selectedIndex) =>
                                selectedIndex !== index && selectedApprover.userId === user.id,
                            );
                            return (
                              <SelectItem key={user.id} value={user.id} disabled={alreadySelected}>
                                {user.name}
                                {alreadySelected ? " - Already selected" : ""}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    {formState.approvers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeApprover(index)}
                        disabled={actionLoading}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {formState.approvers.filter((approver) => approver.userId).length > 1 && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formState.isSequential}
                    onCheckedChange={(value) =>
                      setFormState((prev) => ({ ...prev, isSequential: Boolean(value) }))
                    }
                    disabled={actionLoading}
                  />
                  Require sequential approval
                </label>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal} disabled={actionLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading || !canManageWorkflow}>
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : formState.workflowId ? (
                  "Update Workflow"
                ) : (
                  "Create Workflow"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deleteRuleTarget)}
        onOpenChange={(open) => !open && setDeleteRuleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete payment workflow "{deleteRuleTarget?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PaymentApprovalWorkflowTab;
