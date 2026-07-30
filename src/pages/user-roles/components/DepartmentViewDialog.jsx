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

const DepartmentViewDialog = ({
  open,
  onOpenChange,
  department,
  employees = [],
}) => {
  if (!department) return null;

  const employeeById = new Map(
    employees.map((employee) => [employee.id, employee]),
  );
  const makerUsers =
    department.makerAssignedUsers?.length > 0
      ? department.makerAssignedUsers
      : (department.makerAssignedUserIds || [])
          .map((userId) => employeeById.get(userId))
          .filter(Boolean);

  const checkerUsers =
    department.checkerAssignedUsers?.length > 0
      ? department.checkerAssignedUsers
      : (department.checkerAssignedUserIds || [])
          .map((userId) => employeeById.get(userId))
          .filter(Boolean);

  const renderUsersList = (users, emptyText) =>
    users.length > 0 ? (
      <ScrollArea className="h-56 rounded-md border border-border">
        <div className="space-y-3 p-4">
          {users.map((user) => (
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
                  {user?.role}
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
        {emptyText}
      </div>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-hidden sm:max-w-2xl"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Department Details</DialogTitle>
          <DialogDescription>
            View complete information about this department.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Department Name</Label>
              <p className="font-medium">{department.name}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Status</Label>
              <div>
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
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Created Date</Label>
            <p className="text-sm">{formatDate(department.createdDate)}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Description</Label>
            <p className="text-sm">
              {department.description || "No description provided"}
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Assigned Invoice Makers</Label>
                  <Badge variant="outline">
                    {makerUsers.length} user
                    {makerUsers.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                {renderUsersList(
                  makerUsers,
                  "No invoice makers assigned to this department.",
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Assigned Invoice Checkers</Label>
                  <Badge variant="outline">
                    {checkerUsers.length} user
                    {checkerUsers.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                {renderUsersList(
                  checkerUsers,
                  "No invoice checkers assigned to this department.",
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentViewDialog;
