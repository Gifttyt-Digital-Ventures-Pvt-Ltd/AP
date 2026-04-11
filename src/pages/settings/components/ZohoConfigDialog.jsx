import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

// Zoho integration credential dialog.
const ZohoConfigDialog = ({ open, setOpen, ZohoLogo, zohoConfig, setZohoConfig, handleZohoConfigSave }) => (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-w-md" data-testid="zoho-config-dialog">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <ZohoLogo />
          <span>Configure Zoho Books</span>
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); handleZohoConfigSave(); }} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="zoho_client_id">Client ID *</Label>
          <Input
            id="zoho_client_id"
            value={zohoConfig.client_id}
            onChange={(e) => setZohoConfig({ ...zohoConfig, client_id: e.target.value })}
            placeholder="Enter Zoho Client ID"
            data-testid="zoho-client-id-input"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Get this from <a href="https://api-console.zoho.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Zoho API Console</a>
          </p>
        </div>
        <div>
          <Label htmlFor="zoho_client_secret">Client Secret *</Label>
          <Input
            id="zoho_client_secret"
            type="password"
            value={zohoConfig.client_secret}
            onChange={(e) => setZohoConfig({ ...zohoConfig, client_secret: e.target.value })}
            placeholder="Enter Zoho Client Secret"
            data-testid="zoho-client-secret-input"
          />
        </div>
        <div>
          <Label htmlFor="zoho_org_id">Organization ID</Label>
          <Input
            id="zoho_org_id"
            value={zohoConfig.organization_id}
            onChange={(e) => setZohoConfig({ ...zohoConfig, organization_id: e.target.value })}
            placeholder="Enter Zoho Organization ID"
            data-testid="zoho-org-id-input"
          />
          <p className="text-xs text-muted-foreground mt-1">Found in Zoho Books under Settings to Organization</p>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1 bg-violet-500 hover:bg-violet-600">
            Save Configuration
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
);

export default ZohoConfigDialog;
