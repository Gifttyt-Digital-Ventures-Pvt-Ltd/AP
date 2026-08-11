import React, { useState } from "react";
import { Eye, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateDepartmentMutation,
  useGetDepartmentsQuery,
  useGetDepartmentInvoiceApproversQuery,
  useUpdateDepartmentStatusMutation,
  useUpdateDepartmentMutation,
} from "../../../Services/apis/departmentsApi";
import AppDataTable from "../../../components/common/AppDataTable";
import RefreshButton from "../../../components/common/RefreshButton";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { TableCell, TableRow } from "../../../components/ui/table";
import { cn } from "../../../lib/utils";
import { useActionGuard } from "../../../hooks/useActionGuard";
import DepartmentDialog from "./DepartmentDialog";
import DepartmentViewDialog from "./DepartmentViewDialog";

const departmentTableHeader = [
  { key: "name", title: "Department Name", cellClassName: "font-medium" },
  {
    key: "assignedMakers",
    title: "Assigned Maker",
    cellClassName: "max-w-[180px] text-sm text-muted-foreground",
  },
  {
    key: "assignedCheckers",
    title: "Assigned Checker",
    cellClassName: "max-w-[180px] text-sm text-muted-foreground",
  },
  {
    key: "approvers",
    title: "Approvers",
    cellClassName: "max-w-[180px] text-sm text-muted-foreground",
  },
  { key: "status", title: "Status" },
  { key: "createdDate", title: "Created Date" },
  { key: "actions", title: "Actions", headerClassName: "text-left", cellClassName: "text-left" },
];

const formatAssignedUserNames = (users = []) => {
  const names = users
    .map((user) => String(user?.name || user?.email || "").trim())
    .filter(Boolean);

  if (names.length === 0) return "-";
  return names.join(", ");
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
};

const getErrorMessage = (error, fallback) =>
  error?.data?.detail || error?.data?.message || error?.error || fallback;

const DepartmentsTab = () => {
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    isFetching: departmentsFetching,
    isError: departmentsError,
    refetch: refetchDepartments,
  } = useGetDepartmentsQuery();
  const {
    data: approvers = [],
    isLoading: approversLoading,
    isFetching: approversFetching,
    isError: approversError,
    refetch: refetchApprovers,
  } = useGetDepartmentInvoiceApproversQuery();
  const [createDepartment, { isLoading: creatingDepartment }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: updatingDepartment }] = useUpdateDepartmentMutation();
  const [updateDepartmentStatus, { isLoading: updatingDepartmentStatus }] =
    useUpdateDepartmentStatusMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [viewingDepartment, setViewingDepartment] = useState(null);

  const canCreateDepartment = canPerformAction("departments.create");
  const canUpdateDepartment = canPerformAction("departments.update");
  const isApproversLoading = approversLoading || approversFetching;
  const isSavingDepartment = creatingDepartment || updatingDepartment;
  const isMutatingDepartmentStatus = updatingDepartmentStatus;

  const handleCreateDepartment = () => {
    if (!guardAction("departments.create")) return;
    setEditingDepartment(null);
    setDialogOpen(true);
  };

  const handleEditDepartment = (department) => {
    if (!guardAction("departments.update")) return;
    setEditingDepartment(department);
    setDialogOpen(true);
  };

  const handleViewDepartment = (department) => {
    setViewingDepartment(department);
    setViewDialogOpen(true);
  };

  const handleToggleDepartmentStatus = async (department, nextActive) => {
    if (!guardAction("departments.update")) return;

    try {
      await updateDepartmentStatus({
        departmentId: department.id,
        isActive: nextActive,
      }).unwrap();
      toast.success(
        `Department ${nextActive ? "activated" : "deactivated"}`,
      );
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          nextActive
            ? "Failed to activate department"
            : "Failed to deactivate department",
        ),
      );
    }
  };

  const handleSaveDepartment = async (departmentPayload) => {
    try {
      if (editingDepartment) {
        if (!guardAction("departments.update")) return;
        await updateDepartment({
          departmentId: editingDepartment.id,
          department: departmentPayload,
          approvers,
        }).unwrap();
        toast.success("Department updated");
      } else {
        if (!guardAction("departments.create")) return;
        await createDepartment({ department: departmentPayload, approvers }).unwrap();
        toast.success("Department created");
      }

      setDialogOpen(false);
      setEditingDepartment(null);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingDepartment ? "Failed to update department" : "Failed to create department",
        ),
      );
    }
  };

  const retryDepartmentData = () => {
    refetchDepartments();
    refetchApprovers();
  };

  const renderDepartmentRow = (department, rowIndex, headers) => (
    <TableRow key={department.id ?? rowIndex}>
      {headers.map((header) => {
        let value = null;

        switch (header.key) {
          case "name":
            value = department.name;
            break;
          case "assignedMakers":
            value = formatAssignedUserNames(department.makerAssignedUsers);
            break;
          case "assignedCheckers":
            value = formatAssignedUserNames(department.checkerAssignedUsers);
            break;
          case "approvers":
            value = formatAssignedUserNames(department.approverUsers);
            break;
          case "status":
            value = (
              <Badge
                variant="outline"
                className={
                  department.isActive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-gray-50 text-gray-600"
                }
              >
                {department.isActive ? "Active" : "Inactive"}
              </Badge>
            );
            break;
          case "createdDate":
            value = <span className="text-muted-foreground">{formatDate(department.createdDate)}</span>;
            break;
          case "actions":
            value = (
              <div className="flex items-center justify-start gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewDepartment(department)}
                  aria-label={`View ${department.name}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditDepartment(department)}
                  disabled={!canUpdateDepartment || isSavingDepartment}
                  aria-label={`Edit ${department.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Switch
                  checked={department.isActive}
                  onCheckedChange={(checked) =>
                    handleToggleDepartmentStatus(department, Boolean(checked))
                  }
                  disabled={!canUpdateDepartment || isMutatingDepartmentStatus}
                  aria-label={`${department.isActive ? "Deactivate" : "Activate"} ${department.name}`}
                />
              </div>
            );
            break;
          default:
            value = department[header.key] || "-";
        }

        return (
          <TableCell
            key={header.key}
            className={cn("border border-border", header.cellClassName)}
          >
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-['Manrope'] text-xl font-semibold">Departments</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage departments used for approval routing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(departmentsError || approversError) && (
            <RefreshButton type="button" onClick={retryDepartmentData} className="gap-2">
              Retry
            </RefreshButton>
          )}
          <Button
            type="button"
            onClick={handleCreateDepartment}
            disabled={!canCreateDepartment || isSavingDepartment}
            className="gap-2"
            data-testid="create-department-btn"
          >
            {creatingDepartment ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Department
          </Button>
        </div>
      </div>

      <div className="p-6">
        {(departmentsError || approversError) && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {departmentsError
              ? "Failed to load departments."
              : "Failed to load invoice makers. You can still view departments."}
          </div>
        )}

        <AppDataTable
          tableHeader={departmentTableHeader}
          tableData={departments}
          renderRow={renderDepartmentRow}
          emptyMessage="No departments found"
          emptyColSpan={departmentTableHeader.length}
          isLoading={departmentsLoading || departmentsFetching}
          loadingRowCount={4}
          striped
          bordered
        />

        {!departmentsLoading && departments.length === 0 && (
          <div className="mt-4 text-center">
            <Button
              type="button"
              onClick={handleCreateDepartment}
              disabled={!canCreateDepartment || isSavingDepartment}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Your First Department
            </Button>
          </div>
        )}
      </div>

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingDepartment(null);
        }}
        onSave={handleSaveDepartment}
        department={editingDepartment}
        employees={approvers}
        employeesLoading={isApproversLoading}
        employeesError={approversError}
        saving={isSavingDepartment}
      />

      <DepartmentViewDialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setViewingDepartment(null);
        }}
        department={viewingDepartment}
        employees={approvers}
      />

    </div>
  );
};

export default DepartmentsTab;
