import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../components/ui/checkbox";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Textarea } from "../../../components/ui/textarea";

const CategoryDialog = ({
  open,
  onOpenChange,
  onSave,
  category,
  employees = [],
  employeesLoading = false,
  employeesError = false,
  saving = false,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [makerAssignedUserIds, setMakerAssignedUserIds] = useState([]);
  const [checkerAssignedUserIds, setCheckerAssignedUserIds] = useState([]);

  useEffect(() => {
    if (!open) return;

    setName(category?.name || "");
    setDescription(category?.description || "");
    setMakerAssignedUserIds(category?.makerAssignedUserIds || []);
    setCheckerAssignedUserIds(category?.checkerAssignedUserIds || []);
  }, [category, open]);

  const handleMakerToggle = (userId) => {
    setMakerAssignedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleCheckerToggle = (userId) => {
    setCheckerAssignedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const hasRoleToken = (employee, token) => {
    const roles = Array.isArray(employee?.roles) ? employee.roles : [];
    const roleText = [employee?.role, ...roles]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return roleText.includes(token);
  };

  const makerEmployees = employees.filter((employee) =>
    hasRoleToken(employee, "maker"),
  );
  const checkerEmployees = employees.filter((employee) =>
    hasRoleToken(employee, "checker"),
  );

  const renderEmployeeRow = (employee, checked, onToggle, idPrefix) => (
    <div key={employee.id} className="flex items-start gap-3">
      <Checkbox
        id={`${idPrefix}-${employee.id}`}
        checked={checked}
        onCheckedChange={() => onToggle(employee.id)}
      />
      <div className="min-w-0 flex-1">
        <Label
          htmlFor={`${idPrefix}-${employee.id}`}
          className="cursor-pointer font-normal"
        >
          {employee.name || employee.email || "Unnamed Employee"}
        </Label>
        <p className="truncate text-xs text-muted-foreground">
          {employee.email || "No email available"}
        </p>
      </div>
    </div>
  );

  const renderAssignmentSection = (
    title,
    subtitle,
    list,
    emptyText,
    selectedIds,
    onToggle,
    idPrefix,
  ) => (
    <div className="space-y-2">
      <Label>{title}</Label>
      <p className="h-10 text-xs text-muted-foreground">{subtitle}</p>
      <ScrollArea className="h-44 rounded-md border border-border">
        <div className="space-y-3 p-4">
          {employeesLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading users...
            </div>
          ) : list.length > 0 ? (
            list.map((employee) =>
              renderEmployeeRow(
                employee,
                selectedIds.includes(employee.id),
                onToggle,
                idPrefix,
              ),
            )
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {employeesError ? "Unable to load users. You can still save this category." : emptyText}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const uniqueAssignedUserIds = Array.from(
      new Set([...makerAssignedUserIds, ...checkerAssignedUserIds]),
    );

    onSave({
      name: trimmedName,
      description: description.trim(),
      makerAssignedUserIds,
      checkerAssignedUserIds,
      assignedUserIds: uniqueAssignedUserIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-hidden sm:max-w-2xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "Create Category"}
          </DialogTitle>
          <DialogDescription>
            {category
              ? "Update category details and assign invoice makers/checkers."
              : "Create a category and assign invoice makers/checkers for this category."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="category-name">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="category-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter category name"
                required
                data-testid="category-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Enter category description"
                rows={3}
                data-testid="category-description-input"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {renderAssignmentSection(
                "Assigned Invoice Makers",
                "Select users who can create invoices in this category",
                makerEmployees,
                "No invoice makers available. You can still save this category.",
                makerAssignedUserIds,
                handleMakerToggle,
                "category-maker-user",
              )}
              {renderAssignmentSection(
                "Assigned Invoice Checkers",
                "Select users who can check invoices in this category",
                checkerEmployees,
                "No invoice checkers available. You can still save this category.",
                checkerAssignedUserIds,
                handleCheckerToggle,
                "category-checker-user",
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">
                {makerAssignedUserIds.length} maker
                {makerAssignedUserIds.length === 1 ? "" : "s"} selected •{" "}
                {checkerAssignedUserIds.length} checker
                {checkerAssignedUserIds.length === 1 ? "" : "s"} selected
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              data-testid="save-category-btn"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryDialog;
