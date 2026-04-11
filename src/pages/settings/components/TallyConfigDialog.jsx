import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

// Tally integration endpoint/company configuration dialog.
const TallyConfigDialog = ({ open, setOpen, TallyLogo, tallyConfig, setTallyConfig, handleTallyConfigSave }) => (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-w-md" data-testid="tally-config-dialog">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <TallyLogo />
          <span className="ml-2">Configure Tally</span>
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); handleTallyConfigSave(); }} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="tally_server_url">Tally Server URL *</Label>
          <Input
            id="tally_server_url"
            value={tallyConfig.server_url}
            onChange={(e) => setTallyConfig({ ...tallyConfig, server_url: e.target.value })}
            placeholder="http://localhost:9000"
            data-testid="tally-server-url-input"
          />
          <p className="text-xs text-muted-foreground mt-1">Tally Gateway server URL (default: http://localhost:9000)</p>
        </div>
        <div>
          <Label htmlFor="tally_company">Company Name</Label>
          <Input
            id="tally_company"
            value={tallyConfig.company_name}
            onChange={(e) => setTallyConfig({ ...tallyConfig, company_name: e.target.value })}
            placeholder="Enter company name in Tally"
            data-testid="tally-company-input"
          />
          <p className="text-xs text-muted-foreground mt-1">Leave empty to use the currently open company</p>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
            Save Configuration
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);

export default TallyConfigDialog;
