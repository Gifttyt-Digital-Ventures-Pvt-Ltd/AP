import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { createEmptyGstRegistration } from '../../../utils/organisationGst';

const OrgGstRegistrationsSection = ({ registrations = [], onChange }) => {
  const rows = registrations.length > 0 ? registrations : [createEmptyGstRegistration()];

  const updateRow = (id, field, value) => {
    onChange(
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: field === 'gstin' ? value.toUpperCase() : value,
            }
          : row
      )
    );
  };

  const addRow = () => {
    onChange([...rows, createEmptyGstRegistration()]);
  };

  const removeRow = (id) => {
    if (rows.length === 1) {
      onChange([createEmptyGstRegistration()]);
      return;
    }
    onChange(rows.filter((row) => row.id !== id));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>GST Registrations</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Add each GSTIN with its GST portal username. You can register multiple GSTINs for this organisation.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end rounded-lg border border-gray-200 bg-gray-50/50 p-3"
            data-testid={`org-gst-registration-row-${index}`}
          >
            <div>
              <Label htmlFor={`gstin-${row.id}`}>GSTIN</Label>
              <Input
                id={`gstin-${row.id}`}
                value={row.gstin}
                onChange={(e) => updateRow(row.id, 'gstin', e.target.value)}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                data-testid={`org-gstin-input-${index}`}
              />
            </div>
            <div>
              <Label htmlFor={`gst-username-${row.id}`}>GST Portal Username</Label>
              <Input
                id={`gst-username-${row.id}`}
                value={row.username}
                onChange={(e) => updateRow(row.id, 'username', e.target.value)}
                placeholder="Portal login username"
                data-testid={`org-gst-username-input-${index}`}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRow(row.id)}
              className="text-destructive hover:text-destructive"
              aria-label={`Remove GST registration ${index + 1}`}
              data-testid={`org-gst-remove-btn-${index}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        className="gap-2"
        data-testid="org-gst-add-btn"
      >
        <Plus className="h-4 w-4" />
        Add GST Registration
      </Button>
    </div>
  );
};

export default OrgGstRegistrationsSection;
