import React from "react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { UserPlus } from "lucide-react";

const InviteUserDialog = ({
  open,
  setOpen,
  inviteForm,
  setInviteForm,
  handleInviteUser,
  mode = "add",
}) => {
  const isEditMode = mode === "edit";
  const isSubmitDisabled =
    !inviteForm.name?.trim() ||
    !inviteForm.email?.trim() ||
    !inviteForm.mobile?.trim() ||
    !inviteForm.department?.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl" data-testid="invite-user-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {isEditMode ? "Edit User" : "Add New User"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleInviteUser} className="space-y-5 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name*</Label>
              <Input
                id="name"
                value={inviteForm.name}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, name: e.target.value })
                }
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address*</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
                placeholder="name@company.com"
                required
                disabled={isEditMode}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number*</Label>
              <Input
                id="mobile"
                value={inviteForm.mobile || ""}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, mobile: e.target.value })
                }
                placeholder="Enter mobile number"
                required
                disabled={isEditMode}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeCode">Employee ID</Label>
              <Input
                id="employeeCode"
                value={inviteForm.employeeCode || ""}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, employeeCode: e.target.value })
                }
                placeholder="Enter employee id/code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                value={inviteForm.grade || ""}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, grade: e.target.value })
                }
                placeholder="Enter grade"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department*</Label>
              <Input
                id="department"
                required
                value={inviteForm.department || ""}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, department: e.target.value })
                }
                placeholder="Enter department"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              value={inviteForm.role || ""}
              onChange={(e) =>
                setInviteForm({ ...inviteForm, role: e.target.value })
              }
              placeholder="Enter designation"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitDisabled}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isEditMode ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
