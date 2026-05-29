import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Badge } from "../../../components/ui/badge";
import { Label } from "../../../components/ui/label";
import { ScrollArea } from "../../../components/ui/scroll-area";
import { Separator } from "../../../components/ui/separator";

const getInitials = (name = "") =>
  String(name)
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const CategoryViewDialog = ({ open, onOpenChange, category, employees = [] }) => {
  if (!category) return null;

  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));
  const assignedUsers =
    category.assignedUsers?.length > 0
      ? category.assignedUsers
      : category.assignedUserIds.map((userId) => employeeById.get(userId)).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Category Details</DialogTitle>
          <DialogDescription>View complete information about this category.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Category Name</Label>
              <p className="font-medium">{category.name}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Created Date</Label>
              <p className="text-sm">{formatDate(category.createdDate)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Description</Label>
            <p className="text-sm">{category.description || "No description provided"}</p>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Assigned Invoice Makers</Label>
              <Badge variant="outline">
                {assignedUsers.length} user{assignedUsers.length === 1 ? "" : "s"}
              </Badge>
            </div>

            {assignedUsers.length > 0 ? (
              <ScrollArea className="h-64 rounded-md border border-border">
                <div className="space-y-3 p-4">
                  {assignedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-start gap-3 rounded-md bg-muted/50 p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                        {getInitials(user.name || user.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.name || "Unnamed Approver"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.role || "Invoice Maker"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email || "No email available"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">
                No invoice makers assigned to this category.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryViewDialog;
