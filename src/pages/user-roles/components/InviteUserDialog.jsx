import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { UserPlus } from 'lucide-react';

// Existing invite-user flow extracted so page can focus on orchestration logic.
const InviteUserDialog = ({ open, setOpen, inviteForm, setInviteForm, availableRoles = [], handleInviteUser }) => {
  const roleOptions = availableRoles.length > 0
    ? availableRoles
    : ['Admin', 'Finance Manager', 'Procurement Officer', 'Approver'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md" data-testid="invite-user-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add New User
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleInviteUser} className="space-y-4 mt-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={inviteForm.name}
              onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="user@company.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
            >
              {roleOptions.map((roleName) => (
                <option key={roleName} value={roleName}>
                  {roleName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="password">Temporary Password</Label>
            <Input
              id="password"
              type="text"
              value={inviteForm.password}
              onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
              placeholder="Welcome@123"
            />
            <p className="text-xs text-muted-foreground mt-1">
              User should change this on first login
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
