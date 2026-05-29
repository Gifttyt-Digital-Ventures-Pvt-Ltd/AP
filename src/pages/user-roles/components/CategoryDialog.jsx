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
  const [assignedUserIds, setAssignedUserIds] = useState([]);

  useEffect(() => {
    if (!open) return;

    setName(category?.name || "");
    setDescription(category?.description || "");
    setAssignedUserIds(category?.assignedUserIds || []);
  }, [category, open]);

  const handleUserToggle = (userId) => {
    setAssignedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    onSave({
      name: trimmedName,
      description: description.trim(),
      assignedUserIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "Create Category"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Update category details and assigned approval users."
              : "Add a category for approval routing and assign eligible users."}
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

            <div className="space-y-2">
              <Label>Assigned Invoice Makers</Label>
              <p className="text-xs text-muted-foreground">
                Select users who can approve invoices in this category.
              </p>
              <ScrollArea className="h-56 rounded-md border border-border">
                <div className="space-y-3 p-4">
                  {employeesLoading ? (
                    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading invoice makers...
                    </div>
                  ) : employees.length > 0 ? (
                    employees.map((employee) => (
                      <div key={employee.id} className="flex items-start gap-3">
                        <Checkbox
                          id={`category-user-${employee.id}`}
                          checked={assignedUserIds.includes(employee.id)}
                          onCheckedChange={() => handleUserToggle(employee.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <Label
                            htmlFor={`category-user-${employee.id}`}
                            className="cursor-pointer font-normal"
                          >
                            {employee.name || employee.email || "Unnamed Employee"}
                          </Label>
                          <p className="truncate text-xs text-muted-foreground">
                            {[employee.role, employee.email].filter(Boolean).join(" • ") ||
                              "No role or email available"}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      {employeesError
                        ? "Unable to load invoice makers. You can still save this category."
                        : "No invoice makers available. You can still save this category."}
                    </div>
                  )}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {assignedUserIds.length} user{assignedUserIds.length === 1 ? "" : "s"} selected
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} data-testid="save-category-btn">
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
