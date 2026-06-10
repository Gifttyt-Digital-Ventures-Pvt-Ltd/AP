import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Badge } from "../../../components/ui/badge";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const UserDetailsDialog = ({
  open,
  onOpenChange,
  user,
  assignedRoleSets = [],
}) => {
  if (!user) return null;

  const designation = String(user.role || user.raw?.role || "").trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            View profile and access information for this user.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-medium">{user.name || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium break-all">{user.email || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mobile Number</p>
            <p className="text-sm font-medium">
              {user.mobile ||
                user.phoneNumber ||
                user.raw?.phoneNumber ||
                user.raw?.mobile ||
                user.raw?.phone ||
                "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{user.department || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge
              variant="outline"
              className={
                user.is_active
                  ? "border-emerald-200 text-emerald-700"
                  : "border-red-200 text-red-700"
              }
            >
              {user.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Employee Code</p>
            <p className="text-sm font-medium">{user.empId || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Designation</p>
            <p className="text-sm font-medium">{designation || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground mb-2">Assigned Role Sets</p>
            {assignedRoleSets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {assignedRoleSets.map((roleName) => (
                  <Badge key={String(roleName)} variant="secondary">
                    {String(roleName)}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium">-</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailsDialog;
