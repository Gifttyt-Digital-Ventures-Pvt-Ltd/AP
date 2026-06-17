import React, { useEffect, useMemo, useState } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Checkbox } from "../../../components/ui/checkbox";
import { Switch } from "../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { toast } from "sonner";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit,
  Loader2,
  Minus,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  useCreateWorkflowMutation,
  useDeleteWorkflowMutation,
  useGetWorkflowInvoiceApproversQuery,
  useGetWorkflowTypesQuery,
  useGetWorkflowsQuery,
  useSwitchWorkflowMutation,
  useTestWorkflowMutation,
  useUpdateWorkflowMutation,
} from "../../../Services/apis/workflowApi";
import { useGetCorporateDepartmentsQuery } from "../../../Services/apis/corporateApi";
import { useGetCategoriesQuery } from "../../../Services/apis/categoriesApi";
import {
  FALLBACK_USERS,
  WORKFLOW_SECTIONS,
  WORKFLOW_TYPE_BADGE_CLASSES,
  WORKFLOW_TYPE_LABELS,
  getMatchingExplainerStepOne,
  getMatchingPriorityOrder,
  getConditionVisibility,
  getWorkflowTypeLabel,
} from "../constants/approvalWorkflowConfig";
import {
  getConditionSummary,
  groupRulesByType,
  hasCatchAllRule,
} from "../utils/approvalWorkflowUtils";
import WorkflowViewDialog from "./WorkflowViewDialog";
import CurrencySelector from "../../../components/common/CurrencySelector";
import { useCurrencyFilter } from "../../../hooks/useCurrencyFilter";
import {
  CURRENCY_FILTER_ALL,
  CURRENCY_SCREENS,
  DEFAULT_CURRENCY,
} from "../../../utils/currency";

const DEFAULT_WORKFLOW_TYPES = Object.keys(WORKFLOW_TYPE_LABELS);

const workflowTypeIncludesCategory = (type = "") =>
  String(type || "")
    .split("_")
    .includes("CATEGORY");

const emptyFormState = {
  id: "",
  name: "",
  type: "",
  vendorIds: [],
  departmentIds: [],
  categoryIds: [],
  minAmount: "",
  maxAmount: "",
  currency: DEFAULT_CURRENCY,
  approvers: [{ userId: "", userName: "" }],
  isSequential: false,
};

const initialsForName = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .map((token) => token[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

const resolveEntityId = (item, keys = []) => {
  if (!item || typeof item !== "object") return "";
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
};

const resolveEntityName = (item, keys = []) => {
  if (!item || typeof item !== "object") return "";
  for (const key of keys) {
    const value = item[key];
    if (value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
};

const normalizeEntityList = (items = [], type = "entity") => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      if (typeof item === "string" || typeof item === "number") {
        const value = String(item);
        return {
          id: value,
          name: value,
        };
      }

      const idKeys =
        type === "vendor"
          ? ["id", "vendorId", "vendor_id", "vendorUUID"]
          : type === "category"
            ? ["id", "categoryId", "category_id"]
            : ["id", "departmentId", "department_id"];
      const nameKeys =
        type === "vendor"
          ? ["name", "vendorName", "vendor_name", "legalName"]
          : type === "category"
            ? ["name", "categoryName", "category_name"]
            : ["name", "departmentName", "department_name"];

      const id = resolveEntityId(item, idKeys);
      const name = resolveEntityName(item, nameKeys);

      const fallbackId = id || `${type}-${index + 1}`;
      return {
        id: fallbackId,
        name: name || id || `${type}-${index + 1}`,
      };
    })
    .filter((entry) => entry.id);
};

const normalizeApprovers = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      const approverId =
        item?.approverId ??
        item?.employeeId ??
        item?.userId ??
        item?.id ??
        item?.approver_id ??
        null;
      const userId = toStringId(approverId);
      const level = asNumberOrNull(
        item?.level ?? item?.approvalOrder ?? item?.order,
      );

      return {
        id: `${userId || "approver"}-${index}`,
        userId,
        userName: String(
          item?.approverName || item?.name || item?.userName || "",
        ).trim(),
        approvalOrder: level && level > 0 ? level : index + 1,
      };
    })
    .filter((approver) => approver.userId)
    .sort((left, right) => left.approvalOrder - right.approvalOrder);
};

const getErrorMessage = (error, fallbackMessage) => {
  return (
    error?.data?.detail ||
    error?.data?.message ||
    error?.error ||
    fallbackMessage
  );
};

const mapWorkflowToUiRule = (workflow = {}) => {
  const vendorEntries = normalizeEntityList(workflow.vendor, "vendor");
  const departmentEntries = normalizeEntityList(
    workflow.department,
    "department",
  );
  const categoryEntries = normalizeEntityList(workflow.category, "category");
  const approvers = normalizeApprovers(workflow.approvers);
  const workflowId = workflow.workflowId;

  return {
    id: toStringId(workflowId),
    workflowId: asNumberOrNull(workflowId),
    name: String(workflow.name || "").trim(),
    type: String(workflow.workflowType || "").trim(),
    vendorIds: vendorEntries.map((item) => item.id),
    vendorNames: vendorEntries.map((item) => item.name),
    departmentIds: departmentEntries.map((item) => item.id),
    departmentNames: departmentEntries.map((item) => item.name),
    categoryIds: categoryEntries.map((item) => item.id),
    categoryNames: categoryEntries.map((item) => item.name),
    minAmount: asNumberOrNull(workflow.minAmount),
    maxAmount: asNumberOrNull(workflow.maxAmount),
    currency: String(workflow.currency || DEFAULT_CURRENCY)
      .trim()
      .toUpperCase(),
    approvalMode: workflow.isSequential ? "sequential" : "parallel",
    approvers,
    isActive: workflow.isActive === true,
  };
};

const ApproverAvatarChain = ({ approvers = [], approvalMode = "parallel" }) => {
  return (
    <div className="flex items-center gap-2">
      {approvers.slice(0, 3).map((approver, idx) => (
        <div key={approver.id} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center"
            title={approver.userName}
          >
            {initialsForName(approver.userName)}
          </div>
          {approvalMode === "sequential" && idx < approvers.length - 1 && (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      ))}
      {approvers.length > 3 && (
        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center justify-center">
          +{approvers.length - 3}
        </div>
      )}
    </div>
  );
};

const WorkflowRuleRow = ({
  rule,
  canManageWorkflow,
  workflowActionLoading,
  onViewRule,
  onToggleRule,
  onEditRule,
  onDeleteRule,
}) => {
  const isGenericRule = rule.type === "GENERIC";
  const toggleDisabled =
    workflowActionLoading ||
    !canManageWorkflow ||
    (isGenericRule && rule.isActive);
  const deleteDisabled =
    workflowActionLoading || !canManageWorkflow || isGenericRule;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!workflowActionLoading) onViewRule(rule);
      }}
      onKeyDown={(event) => {
        if (workflowActionLoading) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewRule(rule);
        }
      }}
      aria-label={`View workflow ${rule.name}`}
      className={`rounded-lg border p-4 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${rule.isActive ? "bg-card hover:bg-muted/30" : "bg-muted/20 opacity-70 hover:opacity-100"}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Badge
            variant="outline"
            className={`shrink-0 border ${WORKFLOW_TYPE_BADGE_CLASSES[rule.type] || "bg-gray-100 text-gray-800 border-gray-200"}`}
          >
            {getWorkflowTypeLabel(rule.type)}
          </Badge>
          <div className="min-w-0">
            <p className="font-medium">{rule.name}</p>
            <p className="text-sm text-muted-foreground">
              {getConditionSummary(rule)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap md:justify-end">
          <ApproverAvatarChain
            approvers={rule.approvers}
            approvalMode={rule.approvalMode}
          />

          {rule.approvers.length > 1 && (
            <Badge
              variant="outline"
              className={
                rule.approvalMode === "sequential"
                  ? "text-blue-700 border-blue-200 bg-blue-50"
                  : "text-emerald-700 border-emerald-200 bg-emerald-50"
              }
            >
              {rule.approvalMode === "sequential" ? "Sequential" : "Parallel"}
            </Badge>
          )}

          <div
            className="flex items-center gap-3"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Switch
              checked={rule.isActive}
              onCheckedChange={() => onToggleRule(rule)}
              disabled={toggleDisabled}
              aria-label={rule.isActive ? "Disable rule" : "Enable rule"}
            />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditRule(rule)}
                title="Edit Rule"
                className="h-8 w-8 p-0"
                disabled={workflowActionLoading || !canManageWorkflow}
              >
                <Edit className="h-4 w-4 text-blue-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteRule(rule)}
                title="Delete Rule"
                className="h-8 w-8 p-0"
                disabled={deleteDisabled}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApprovalWorkflowTab = ({
  vendors = [],
  canManageWorkflow = true,
  categoryEnabled = true,
}) => {
  const [deleteRuleTarget, setDeleteRuleTarget] = useState(null);
  const [viewRule, setViewRule] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState("");
  const [formState, setFormState] = useState(emptyFormState);

  const [tester, setTester] = useState({
    vendorId: "",
    departmentId: "",
    categoryId: "",
    amount: "",
    currency: DEFAULT_CURRENCY,
    tested: false,
    result: null,
  });

  const {
    currencies: filterCurrencies,
    selectedCurrency: listCurrency,
    setSelectedCurrency: setListCurrency,
    queryArgs: workflowListQueryArgs,
  } = useCurrencyFilter(CURRENCY_SCREENS.WORKFLOW);

  const workflowRuleCurrencies = useMemo(
    () =>
      filterCurrencies.filter((currency) => currency !== CURRENCY_FILTER_ALL),
    [filterCurrencies],
  );

  const {
    data: workflowTypesData = [],
    isLoading: workflowTypesLoading,
    isError: workflowTypesError,
  } = useGetWorkflowTypesQuery();
  const {
    data: workflowApproversData = [],
    isLoading: workflowApproversLoading,
    isError: workflowApproversError,
  } = useGetWorkflowInvoiceApproversQuery();
  const {
    data: workflowsResponse = null,
    isLoading: workflowsLoading,
    isFetching: workflowsFetching,
    isError: workflowsError,
    refetch: refetchWorkflows,
  } = useGetWorkflowsQuery(workflowListQueryArgs);
  const { data: departmentsData = [], isError: departmentsError } =
    useGetCorporateDepartmentsQuery();
  const { data: categoriesData = [], isError: categoriesError } =
    useGetCategoriesQuery(undefined, { skip: !categoryEnabled });

  const [createWorkflow, { isLoading: createWorkflowLoading }] =
    useCreateWorkflowMutation();
  const [updateWorkflow, { isLoading: updateWorkflowLoading }] =
    useUpdateWorkflowMutation();
  const [switchWorkflow, { isLoading: switchWorkflowLoading }] =
    useSwitchWorkflowMutation();
  const [deleteWorkflow, { isLoading: deleteWorkflowLoading }] =
    useDeleteWorkflowMutation();
  const [testWorkflow, { isLoading: testWorkflowLoading }] =
    useTestWorkflowMutation();

  useEffect(() => {
    if (workflowTypesError) {
      toast.error("Failed to load workflow types");
    }
  }, [workflowTypesError]);

  useEffect(() => {
    if (workflowApproversError) {
      toast.error("Failed to load invoice approvers");
    }
  }, [workflowApproversError]);

  useEffect(() => {
    if (workflowsError) {
      toast.error("Failed to load approval workflows");
    }
  }, [workflowsError]);
  useEffect(() => {
    if (departmentsError) {
      toast.error("Failed to load departments");
    }
  }, [departmentsError]);
  useEffect(() => {
    if (categoryEnabled && categoriesError) {
      toast.error("Failed to load categories");
    }
  }, [categoriesError, categoryEnabled]);

  const rules = useMemo(() => {
    const grouped = workflowsResponse?.workflowTypeId;
    if (!grouped || typeof grouped !== "object") return [];

    return Object.entries(grouped).flatMap(([workflowType, items]) => {
      if (!categoryEnabled && workflowTypeIncludesCategory(workflowType))
        return [];
      if (!Array.isArray(items)) return [];
      return items
        .map((workflow) =>
          mapWorkflowToUiRule({
            ...workflow,
            workflowType: workflow.workflowType || workflowType,
          }),
        )
        .filter(
          (rule) => categoryEnabled || !workflowTypeIncludesCategory(rule.type),
        );
    });
  }, [workflowsResponse, categoryEnabled]);

  const groupedRules = useMemo(() => groupRulesByType(rules), [rules]);
  const noCatchAllRule = !hasCatchAllRule(rules);

  const workflowSections = useMemo(() => {
    const configured = WORKFLOW_SECTIONS.filter(
      ({ type }) => categoryEnabled || !workflowTypeIncludesCategory(type),
    );
    const configuredTypes = new Set(configured.map((section) => section.type));
    const extraTypes = Object.keys(groupedRules).filter(
      (type) =>
        !configuredTypes.has(type) && (groupedRules[type] || []).length > 0,
    );

    return [
      ...configured,
      ...extraTypes.map((type, index) => ({
        type,
        priority: configured.length + index + 1,
      })),
    ];
  }, [groupedRules, categoryEnabled]);

  const workflowTypes = useMemo(() => {
    const types =
      Array.isArray(workflowTypesData) && workflowTypesData.length > 0
        ? workflowTypesData
        : DEFAULT_WORKFLOW_TYPES;

    return types
      .map((type) => String(type || "").trim())
      .filter(Boolean)
      .filter((type) => categoryEnabled || !workflowTypeIncludesCategory(type));
  }, [workflowTypesData, categoryEnabled]);

  const editableWorkflowTypes = useMemo(() => {
    return workflowTypes.filter((type) => type !== "GENERIC");
  }, [workflowTypes]);

  const workflowUsers = useMemo(() => {
    if (
      Array.isArray(workflowApproversData) &&
      workflowApproversData.length > 0
    ) {
      return workflowApproversData
        .map((user) => ({
          id: toStringId(user.employeeId),
          name: String(user.name || "").trim(),
          role: "Invoice Approver",
          email: String(user.email || "").trim(),
        }))
        .filter((user) => user.id && user.name);
    }

    return FALLBACK_USERS;
  }, [workflowApproversData]);

  const workflowVendors = useMemo(() => {
    const vendorMap = new Map();

    if (Array.isArray(vendors) && vendors.length > 0) {
      vendors.forEach((vendor) => {
        const id = toStringId(vendor.id);
        const name = String(vendor.name || vendor.vendor_name || "").trim();
        if (id && name) {
          vendorMap.set(id, name);
        }
      });
    }

    rules.forEach((rule) => {
      rule.vendorIds.forEach((vendorId, index) => {
        if (!vendorMap.has(vendorId)) {
          vendorMap.set(
            vendorId,
            rule.vendorNames[index] || `Vendor ${vendorId}`,
          );
        }
      });
    });

    if (vendorMap.size === 0) {
      return [];
    }

    return Array.from(vendorMap.entries()).map(([id, name]) => ({ id, name }));
  }, [vendors, rules]);

  const workflowDepartments = useMemo(() => {
    const departmentMap = new Map();

    if (Array.isArray(departmentsData)) {
      departmentsData.forEach((department) => {
        const id = toStringId(
          department?.id ??
            department?.departmentId ??
            department?.department_id ??
            department?.cost_center_id ??
            department?.costCenterId,
        );
        const name = String(
          department?.name ??
            department?.departmentName ??
            department?.department_name ??
            department?.cost_center_name ??
            department?.costCenterName ??
            department?.cost_center_code ??
            department?.costCenterCode ??
            "",
        ).trim();
        if (id && name) {
          departmentMap.set(id, name);
        }
      });
    }

    rules.forEach((rule) => {
      rule.departmentIds.forEach((departmentId, index) => {
        if (!departmentMap.has(departmentId)) {
          departmentMap.set(
            departmentId,
            rule.departmentNames[index] || `Department ${departmentId}`,
          );
        }
      });
    });

    return Array.from(departmentMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [departmentsData, rules]);

  const workflowCategories = useMemo(() => {
    if (!categoryEnabled) return [];
    const categoryMap = new Map();

    if (Array.isArray(categoriesData)) {
      categoriesData.forEach((category) => {
        const id = toStringId(
          category?.id ?? category?.categoryId ?? category?.category_id,
        );
        const name = String(
          category?.name ??
            category?.categoryName ??
            category?.category_name ??
            "",
        ).trim();
        if (id) {
          categoryMap.set(id, name || `Category ${id}`);
        }
      });
    }

    rules.forEach((rule) => {
      (rule.categoryIds || []).forEach((categoryId, index) => {
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(
            categoryId,
            rule.categoryNames?.[index] || `Category ${categoryId}`,
          );
        }
      });
    });

    return Array.from(categoryMap.entries()).map(([id, name]) => ({
      id,
      name,
    }));
  }, [categoriesData, rules, categoryEnabled]);

  const workflowActionLoading =
    createWorkflowLoading ||
    updateWorkflowLoading ||
    switchWorkflowLoading ||
    deleteWorkflowLoading;

  const openCreateModal = () => {
    setEditingRuleId("");
    const defaultType = editableWorkflowTypes[0] || "";
    setFormState({
      ...emptyFormState,
      type: defaultType,
    });
    setModalOpen(true);
  };

  const openViewModal = (rule) => {
    setViewRule(rule);
    setViewDialogOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRuleId(rule.id);
    setFormState({
      id: rule.id,
      name: rule.name || "",
      type: rule.type || "",
      vendorIds: Array.isArray(rule.vendorIds) ? rule.vendorIds : [],
      departmentIds: Array.isArray(rule.departmentIds)
        ? rule.departmentIds
        : [],
      categoryIds: Array.isArray(rule.categoryIds) ? rule.categoryIds : [],
      minAmount:
        rule.minAmount !== undefined && rule.minAmount !== null
          ? String(rule.minAmount)
          : "",
      maxAmount:
        rule.maxAmount !== undefined && rule.maxAmount !== null
          ? String(rule.maxAmount)
          : "",
      currency: rule.currency || DEFAULT_CURRENCY,
      approvers:
        Array.isArray(rule.approvers) && rule.approvers.length > 0
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
    setEditingRuleId("");
    setFormState(emptyFormState);
  };

  const addApprover = () => {
    setFormState((prev) => ({
      ...prev,
      approvers: [...prev.approvers, { userId: "", userName: "" }],
    }));
  };

  const removeApprover = (index) => {
    setFormState((prev) => {
      const nextApprovers = prev.approvers.filter((_, idx) => idx !== index);
      return {
        ...prev,
        approvers:
          nextApprovers.length > 0
            ? nextApprovers
            : [{ userId: "", userName: "" }],
        isSequential: nextApprovers.length > 1 ? prev.isSequential : false,
      };
    });
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
        toast.error("This approver is already selected for another level");
        return prev;
      }

      const selectedUser = workflowUsers.find((user) => user.id === userId);
      const nextApprovers = [...prev.approvers];
      nextApprovers[index] = {
        userId,
        userName: selectedUser?.name || "",
      };
      return {
        ...prev,
        approvers: nextApprovers,
      };
    });
  };

  const toggleFormSelection = (field, id, checked) => {
    setFormState((prev) => {
      const currentValues = Array.isArray(prev[field]) ? prev[field] : [];
      return {
        ...prev,
        [field]: checked
          ? Array.from(new Set([...currentValues, id]))
          : currentValues.filter((value) => value !== id),
      };
    });
  };

  const handleToggleRule = async (rule) => {
    if (!canManageWorkflow) {
      toast.error("You do not have permission to modify workflows");
      return;
    }

    if (rule.type === "GENERIC" && rule.isActive) {
      toast.error("Generic workflow cannot be disabled");
      return;
    }

    if (rule.workflowId === null || rule.workflowId === undefined) {
      toast.error("Unable to update workflow: invalid workflow id");
      return;
    }

    try {
      await switchWorkflow({
        workflowId: rule.workflowId,
        isActive: !rule.isActive,
      }).unwrap();
      toast.success(`Workflow ${rule.isActive ? "disabled" : "enabled"}`);
      refetchWorkflows();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update workflow status"));
    }
  };

  const handleDeleteRule = async (rule) => {
    if (!canManageWorkflow) {
      toast.error("You do not have permission to delete workflows");
      return;
    }

    if (rule.type === "GENERIC") {
      toast.error("Generic workflow cannot be deleted");
      return;
    }

    if (rule.workflowId === null || rule.workflowId === undefined) {
      toast.error("Unable to delete workflow: invalid workflow id");
      return;
    }

    setDeleteRuleTarget(rule);
  };

  const confirmDeleteRule = async () => {
    const rule = deleteRuleTarget;
    if (!rule) return;
    try {
      await deleteWorkflow({ workflowId: rule.workflowId }).unwrap();
      toast.success("Workflow deleted");
      refetchWorkflows();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete workflow"));
    } finally {
      setDeleteRuleTarget(null);
    }
  };

  const handleTestRouting = async () => {
    try {
      const response = await testWorkflow({
        vendorId: tester.vendorId,
        departmentId: asNumberOrNull(tester.departmentId),
        amount: Number(tester.amount || 0),
        currency: tester.currency || DEFAULT_CURRENCY,
        ...(categoryEnabled
          ? { categoryId: asNumberOrNull(tester.categoryId) }
          : {}),
      }).unwrap();

      const matchedRule = {
        id: toStringId(response?.workflowId),
        name: String(response?.name || "").trim(),
        type: String(response?.workflowType || "").trim(),
        approvers: [],
      };

      setTester((prev) => ({
        ...prev,
        tested: true,
        result: {
          matched: Boolean(response?.workflowId),
          rule: matchedRule,
          reason: response?.workflowId
            ? `Matched rule "${matchedRule.name}" (type: ${matchedRule.type})`
            : "No matching rule found. Invoice flagged for manual review.",
        },
      }));
    } catch (error) {
      setTester((prev) => ({
        ...prev,
        tested: true,
        result: {
          matched: false,
          reason: getErrorMessage(
            error,
            "No matching rule found. Invoice flagged for manual review.",
          ),
          rule: null,
        },
      }));
    }
  };

  const validateWorkflowForm = () => {
    if (!formState.name.trim()) {
      toast.error("Workflow name is required");
      return false;
    }

    if (!formState.type) {
      toast.error("Please select a workflow type");
      return false;
    }

    if (!categoryEnabled && workflowTypeIncludesCategory(formState.type)) {
      toast.error("Category workflows are not enabled for this corporate");
      return false;
    }

    if (!editingRuleId && formState.type === "GENERIC") {
      toast.error(
        "GENERIC workflow is created automatically and cannot be submitted",
      );
      return false;
    }

    const visibility = getConditionVisibility(formState.type);
    const selectedVendorIds = Array.isArray(formState.vendorIds)
      ? formState.vendorIds
      : [];
    const selectedDepartmentIds = Array.isArray(formState.departmentIds)
      ? formState.departmentIds
      : [];
    const selectedCategoryIds = Array.isArray(formState.categoryIds)
      ? formState.categoryIds
      : [];

    if (visibility?.showVendor && selectedVendorIds.length === 0) {
      toast.error("Please select at least one vendor");
      return false;
    }

    if (visibility?.showDept && selectedDepartmentIds.length === 0) {
      toast.error("Please select at least one department");
      return false;
    }

    if (
      visibility?.showDept &&
      selectedDepartmentIds.some(
        (departmentId) => asNumberOrNull(departmentId) === null,
      )
    ) {
      toast.error("Department id must be numeric");
      return false;
    }

    if (
      categoryEnabled &&
      visibility?.showCategory &&
      selectedCategoryIds.length === 0
    ) {
      toast.error("Please select at least one category");
      return false;
    }

    if (
      categoryEnabled &&
      visibility?.showCategory &&
      selectedCategoryIds.some(
        (categoryId) => asNumberOrNull(categoryId) === null,
      )
    ) {
      toast.error("Category id must be numeric");
      return false;
    }

    if (
      visibility?.showAmount &&
      !formState.minAmount &&
      !formState.maxAmount
    ) {
      toast.error("Please enter min amount or max amount");
      return false;
    }

    if (formState.approvers.some((approver) => !approver.userId)) {
      toast.error("Please select all approvers");
      return false;
    }

    const selectedIds = formState.approvers.map((approver) => approver.userId);
    if (new Set(selectedIds).size !== selectedIds.length) {
      toast.error("Duplicate approvers are not allowed");
      return false;
    }

    if (
      formState.approvers.some(
        (approver) => asNumberOrNull(approver.userId) === null,
      )
    ) {
      toast.error("Approver id must be numeric");
      return false;
    }

    if (visibility?.showAmount) {
      const minAmount = asNumberOrNull(formState.minAmount);
      const maxAmount = asNumberOrNull(formState.maxAmount);

      if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
        toast.error("Min amount cannot be greater than max amount");
        return false;
      }
    }

    return true;
  };

  const buildWorkflowPayload = () => {
    const visibility = getConditionVisibility(formState.type);
    const approvers = formState.approvers.map((approver, index) => ({
      approverId: asNumberOrNull(approver.userId),
      level: index + 1,
    }));

    const config = {
      vendorIds:
        visibility?.showVendor && Array.isArray(formState.vendorIds)
          ? formState.vendorIds
          : [],
      departmentIds:
        visibility?.showDept && Array.isArray(formState.departmentIds)
          ? formState.departmentIds
              .map(asNumberOrNull)
              .filter((departmentId) => departmentId !== null)
          : [],
      ...(categoryEnabled
        ? {
            categoryIds:
              visibility?.showCategory && Array.isArray(formState.categoryIds)
                ? formState.categoryIds
                    .map(asNumberOrNull)
                    .filter((categoryId) => categoryId !== null)
                : [],
          }
        : {}),
    };

    if (visibility?.showAmount) {
      config.minAmount = asNumberOrNull(formState.minAmount);
      config.maxAmount = asNumberOrNull(formState.maxAmount);
    }

    return {
      workflowName: formState.name.trim(),
      workflowType: formState.type,
      currency: formState.currency || DEFAULT_CURRENCY,
      approvers,
      isSequential: formState.isSequential && formState.approvers.length > 1,
      config,
      isActive: true,
    };
  };

  const handleSaveWorkflow = async (event) => {
    event.preventDefault();

    if (!canManageWorkflow) {
      toast.error("You do not have permission to modify workflows");
      return;
    }

    if (!validateWorkflowForm()) return;

    try {
      const payload = buildWorkflowPayload();

      if (!editingRuleId) {
        await createWorkflow(payload).unwrap();
        toast.success("Workflow created");
      } else {
        const editedRule = rules.find((rule) => rule.id === editingRuleId);
        if (!editedRule?.workflowId) {
          toast.error("Unable to update workflow: invalid workflow id");
          return;
        }

        if (editedRule.type === "GENERIC") {
          await updateWorkflow({
            workflowId: editedRule.workflowId,
            approvers: payload.approvers,
          }).unwrap();
        } else {
          await updateWorkflow({
            workflowId: editedRule.workflowId,
            ...payload,
            isActive: editedRule.isActive,
          }).unwrap();
        }

        toast.success("Workflow updated");
      }

      closeModal();
      refetchWorkflows();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to save workflow"));
    }
  };

  const isEditingGeneric = editingRuleId && formState.type === "GENERIC";
  const visibility = formState.type
    ? getConditionVisibility(formState.type)
    : null;
  const matchingPriorityOrder = useMemo(
    () => getMatchingPriorityOrder(categoryEnabled),
    [categoryEnabled],
  );
  const matchingExplainerStepOne = useMemo(
    () => getMatchingExplainerStepOne(categoryEnabled),
    [categoryEnabled],
  );

  const loading =
    workflowTypesLoading ||
    workflowApproversLoading ||
    (workflowsLoading && !workflowsResponse);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approval Workflow Tester</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`grid grid-cols-1 ${categoryEnabled ? "md:grid-cols-5" : "md:grid-cols-4"} gap-4`}
          >
            <div>
              <Label>Vendor</Label>
              <Select
                value={tester.vendorId || ""}
                onValueChange={(value) =>
                  setTester((prev) => ({
                    ...prev,
                    vendorId: value,
                    tested: false,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                {workflowVendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Department</Label>
              <Select
                value={tester.departmentId || ""}
                onValueChange={(value) =>
                  setTester((prev) => ({
                    ...prev,
                    departmentId: value,
                    tested: false,
                  }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                {workflowDepartments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
                </SelectContent>
              </Select>
            </div>

            {categoryEnabled && (
              <div>
                <Label>Category</Label>
                <Select
                  value={tester.categoryId || ""}
                  onValueChange={(value) =>
                    setTester((prev) => ({
                      ...prev,
                      categoryId: value,
                      tested: false,
                    }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                  {workflowCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <CurrencySelector
              currencies={workflowRuleCurrencies}
              value={tester.currency}
              onChange={(currency) =>
                setTester((prev) => ({
                  ...prev,
                  currency,
                  tested: false,
                }))
              }
              label="Currency"
            />

            <div>
              <Label>Amount ({tester.currency || DEFAULT_CURRENCY})</Label>
              <Input
                type="number"
                min="0"
                placeholder="Enter amount"
                value={tester.amount}
                onChange={(event) =>
                  setTester((prev) => ({
                    ...prev,
                    amount: event.target.value,
                    tested: false,
                  }))
                }
                className="mt-1"
              />
            </div>
          </div>

          <Button
            className="w-full md:w-auto"
            onClick={handleTestRouting}
            disabled={testWorkflowLoading}
          >
            {testWorkflowLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Find Matching Rule
              </>
            )}
          </Button>

          {tester.tested && tester.result && (
            <div
              className={`rounded-lg border-2 p-4 ${
                tester.result.matched
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {tester.result.matched ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{tester.result.reason}</p>
                  {tester.result.matched && tester.result.rule && (
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Type:{" "}
                        <span className="font-medium text-foreground">
                          {getWorkflowTypeLabel(tester.result.rule.type)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-border rounded-xl">
        <CardContent className="pt-5">
          <button
            type="button"
            onClick={() => setShowExplainer((prev) => !prev)}
            className="w-full flex items-center justify-between text-left"
          >
            <p className="font-medium text-foreground">How matching works</p>
            {showExplainer ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showExplainer && (
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full border border-primary/20 bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <p className="text-base leading-7 text-foreground">
                  <span className="bg-background/80 px-1.5 py-0.5 rounded-sm">
                    {matchingExplainerStepOne}
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full border border-primary/20 bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  2
                </div>
                <p className="text-base leading-7 text-foreground">
                  <span className="bg-background/80 px-1.5 py-0.5 rounded-sm">
                    Rules checked in priority order:{" "}
                    <span className="font-semibold">
                      {matchingPriorityOrder}
                    </span>
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full border border-emerald-300 bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
                <p className="text-base leading-7 text-foreground">
                  <span className="bg-background/80 px-1.5 py-0.5 rounded-sm">
                    First matching rule fires — approvers are notified in
                    sequence
                  </span>
                </p>
              </div>

              <div className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full border border-border bg-background text-muted-foreground flex items-center justify-center">
                  <Minus className="h-4 w-4" />
                </div>
                <p className="text-base leading-7 text-foreground">
                  <span className="bg-background/80 px-1.5 py-0.5 rounded-sm">
                    No match — invoice flagged for manual review
                  </span>
                </p>
              </div>

              <div className="border-t border-border pt-3">
                <p className="text-muted-foreground text-xs">
                  Tip: always add a Generic rule as a catch-all fallback.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Invoice Approval Workflows</h3>
          <p className="text-muted-foreground text-sm">
            Manage routing rules for invoice approvals ({rules.length} rules)
            {workflowsFetching ? " · refreshing..." : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CurrencySelector
            currencies={filterCurrencies}
            value={listCurrency}
            onChange={setListCurrency}
            variant="inline"
            id="workflow-list-currency-filter"
          />
          {canManageWorkflow && (
            <Button
              onClick={openCreateModal}
              disabled={
                workflowActionLoading || editableWorkflowTypes.length === 0
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              New Workflow
            </Button>
          )}
        </div>
      </div>

      {noCatchAllRule && (
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-900">
              No catch-all rule found
            </p>
            <p className="text-sm text-amber-700">
              Invoices that do not match a specific rule will go to manual
              review. Add a Generic workflow as fallback.
            </p>
          </div>
        </div>
      )}

      {!canManageWorkflow && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          You have read-only access to workflows.
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-8">
          {rules.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No workflows found yet.
            </div>
          )}

          {workflowSections.map(({ type, priority }) => {
            const sectionRules = groupedRules[type] || [];
            if (sectionRules.length === 0) return null;

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center">
                    {priority}
                  </span>
                  <h4 className="font-semibold">
                    {getWorkflowTypeLabel(type)}
                  </h4>
                  <div className="h-px bg-border flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {sectionRules.length} rule(s)
                  </span>
                </div>
                <div className="space-y-2">
                  {sectionRules.map((rule) => (
                    <WorkflowRuleRow
                      key={rule.id}
                      rule={rule}
                      canManageWorkflow={canManageWorkflow}
                      workflowActionLoading={workflowActionLoading}
                      onViewRule={openViewModal}
                      onToggleRule={handleToggleRule}
                      onEditRule={openEditModal}
                      onDeleteRule={handleDeleteRule}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <WorkflowViewDialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setViewRule(null);
        }}
        rule={viewRule}
        categoryEnabled={categoryEnabled}
        canManageWorkflow={canManageWorkflow}
        onEdit={openEditModal}
      />

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => (!open ? closeModal() : setModalOpen(open))}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRuleId ? "Edit Workflow" : "Create Workflow"}
            </DialogTitle>
          </DialogHeader>

          <form className="space-y-5" onSubmit={handleSaveWorkflow}>
            <div className="space-y-2">
              <Label>Workflow Name</Label>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g., High-value marketing invoices"
                disabled={workflowActionLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Workflow Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(editingRuleId ? workflowTypes : editableWorkflowTypes).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (isEditingGeneric) return;
                        setFormState((prev) => ({ ...prev, type: value }));
                      }}
                      disabled={workflowActionLoading || isEditingGeneric}
                      className={`text-sm px-3 py-2 rounded-md border transition-colors ${
                        formState.type === value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent border-input"
                      } ${isEditingGeneric ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      {getWorkflowTypeLabel(value)}
                    </button>
                  ),
                )}
              </div>
              {!editingRuleId && (
                <p className="text-xs text-muted-foreground">
                  Generic workflow is auto-created by the server and cannot be
                  manually created.
                </p>
              )}
            </div>

            {visibility && !isEditingGeneric && (
              <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
                <p className="text-sm font-medium">Conditions</p>

                <CurrencySelector
                  currencies={workflowRuleCurrencies}
                  value={formState.currency || DEFAULT_CURRENCY}
                  onChange={(currency) =>
                    setFormState((prev) => ({ ...prev, currency }))
                  }
                  disabled={workflowActionLoading}
                  label="Rule Currency"
                />

                {visibility.showVendor && (
                  <div className="space-y-2">
                    <Label>Vendors</Label>
                    <div className="max-h-44 overflow-y-auto rounded-md border border-input bg-background p-2 space-y-1">
                      {workflowVendors.length === 0 ? (
                        <p className="px-2 py-1 text-sm text-muted-foreground">
                          No vendors available
                        </p>
                      ) : (
                        workflowVendors.map((vendor) => (
                          <label
                            key={vendor.id}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={(formState.vendorIds || []).includes(
                                vendor.id,
                              )}
                              onCheckedChange={(checked) =>
                                toggleFormSelection(
                                  "vendorIds",
                                  vendor.id,
                                  Boolean(checked),
                                )
                              }
                              disabled={workflowActionLoading}
                            />
                            <span>{vendor.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {visibility.showDept && (
                  <div className="space-y-2">
                    <Label>Departments</Label>
                    <div className="max-h-44 overflow-y-auto rounded-md border border-input bg-background p-2 space-y-1">
                      {workflowDepartments.length === 0 ? (
                        <p className="px-2 py-1 text-sm text-muted-foreground">
                          No departments available
                        </p>
                      ) : (
                        workflowDepartments.map((department) => (
                          <label
                            key={department.id}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={(formState.departmentIds || []).includes(
                                department.id,
                              )}
                              onCheckedChange={(checked) =>
                                toggleFormSelection(
                                  "departmentIds",
                                  department.id,
                                  Boolean(checked),
                                )
                              }
                              disabled={workflowActionLoading}
                            />
                            <span>{department.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {categoryEnabled && visibility.showCategory && (
                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <div className="max-h-44 overflow-y-auto rounded-md border border-input bg-background p-2 space-y-1">
                      {workflowCategories.length === 0 ? (
                        <p className="px-2 py-1 text-sm text-muted-foreground">
                          No categories available
                        </p>
                      ) : (
                        workflowCategories.map((category) => (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={(formState.categoryIds || []).includes(
                                category.id,
                              )}
                              onCheckedChange={(checked) =>
                                toggleFormSelection(
                                  "categoryIds",
                                  category.id,
                                  Boolean(checked),
                                )
                              }
                              disabled={workflowActionLoading}
                            />
                            <span>{category.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {visibility.showAmount && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Min Amount ({formState.currency || DEFAULT_CURRENCY})
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={formState.minAmount}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            minAmount: event.target.value,
                          }))
                        }
                        placeholder="0"
                        disabled={workflowActionLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Max Amount ({formState.currency || DEFAULT_CURRENCY})
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={formState.maxAmount}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            maxAmount: event.target.value,
                          }))
                        }
                        placeholder="Unlimited"
                        disabled={workflowActionLoading}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Approvers</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addApprover}
                  disabled={
                    workflowActionLoading ||
                    formState.approvers.filter((approver) => approver.userId)
                      .length >= workflowUsers.length
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Approver
                </Button>
              </div>

              <div className="space-y-2">
                {formState.approvers.map((approver, index) => (
                  <div
                    key={`${approver.userId}-${index}`}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm text-muted-foreground w-6">
                      {index + 1}.
                    </span>
                    <Select
                      value={approver.userId}
                      onValueChange={(value) => updateApprover(index, value)}
                      disabled={workflowActionLoading}
                    >
                      <SelectTrigger className="h-10 flex-1">
                        <SelectValue placeholder="Select approver" />
                      </SelectTrigger>
                      <SelectContent>
                        {workflowUsers.map((user) => {
                          const alreadySelected = formState.approvers.some(
                            (selectedApprover, selectedIndex) =>
                              selectedIndex !== index &&
                              selectedApprover.userId === user.id,
                          );

                          return (
                            <SelectItem
                              key={user.id}
                              value={user.id}
                              disabled={alreadySelected}
                            >
                              {user.name} {user.role ? `(${user.role})` : ""}
                              {alreadySelected ? " - Already selected" : ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {formState.approvers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeApprover(index)}
                        disabled={workflowActionLoading}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {formState.approvers.length > 1 && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={formState.isSequential}
                    onCheckedChange={(value) =>
                      setFormState((prev) => ({
                        ...prev,
                        isSequential: Boolean(value),
                      }))
                    }
                    disabled={workflowActionLoading}
                  />
                  Require sequential approval
                </label>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeModal}
                disabled={workflowActionLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={workflowActionLoading || !canManageWorkflow}
              >
                {workflowActionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingRuleId ? (
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
            <AlertDialogTitle>Delete Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete workflow "{deleteRuleTarget?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteRule}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ApprovalWorkflowTab;
