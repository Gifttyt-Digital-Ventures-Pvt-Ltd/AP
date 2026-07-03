import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import AppSelect from '../../../components/common/AppSelect';
import { createEmptyOrganisationBranch } from '../../../utils/organisationGst';

const OrgBranchesSection = ({ branches = [], gstOptions = [], onChange, showAreaField = false }) => {
  const rows = Array.isArray(branches) ? branches : [];
  const selectOptions = gstOptions.map((gstin) => ({ value: gstin, label: gstin }));

  const updateRow = (id, field, value) => {
    onChange(
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === 'branchCode' || field === 'billingGstin'
                  ? String(value || '').toUpperCase()
                  : value,
            }
          : row,
      ),
    );
  };

  const addRow = () => {
    onChange([...rows, createEmptyOrganisationBranch()]);
  };

  const removeRow = (id) => {
    onChange(rows.filter((row) => row.id !== id));
  };

  const toggleEdit = (id) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, isEditing: !row.isEditing } : row)));
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Label className="text-base font-semibold">Branches</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure operational branches and map them to the GST registration used for billing.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className={showAreaField ? 'min-w-[880px]' : 'min-w-[720px]'}>
          <div
            className={`grid gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground ${
              showAreaField
                ? 'grid-cols-[1.2fr_1fr_1fr_1.4fr_96px]'
                : 'grid-cols-[1.2fr_1fr_1.4fr_96px]'
            }`}
          >
            <div>Branch Name</div>
            <div>Branch Code</div>
            {showAreaField ? <div>Area of Branch (Sq/ft)</div> : null}
            <div>Billing GSTIN</div>
            <div>Actions</div>
          </div>

          {rows.length > 0 ? (
            <div className="divide-y divide-border">
              {rows.map((row, index) => {
                const disabled = row.isEditing === false;
                return (
                  <div
                    key={row.id}
                    className={`grid items-center gap-3 px-3 py-3 ${
                      showAreaField
                        ? 'grid-cols-[1.2fr_1fr_1fr_1.4fr_96px]'
                        : 'grid-cols-[1.2fr_1fr_1.4fr_96px]'
                    }`}
                    data-testid={`org-branch-row-${index}`}
                  >
                    <Input
                      value={row.branchName || ''}
                      disabled={disabled}
                      onChange={(event) => updateRow(row.id, 'branchName', event.target.value)}
                      placeholder="Branch name"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={row.branchCode || ''}
                      disabled={disabled}
                      onChange={(event) => updateRow(row.id, 'branchCode', event.target.value)}
                      placeholder="BR-001"
                      className="h-8 text-sm"
                    />
                    {showAreaField ? (
                      <Input
                        type="number"
                        min="0"
                        value={row.areaSqft ?? ''}
                        disabled={disabled}
                        onChange={(event) => updateRow(row.id, 'areaSqft', event.target.value)}
                        placeholder="1200"
                        className="h-8 text-sm"
                      />
                    ) : null}
                    <AppSelect
                      value={row.billingGstin || ''}
                      onChange={(event) => updateRow(row.id, 'billingGstin', event.target.value)}
                      options={selectOptions}
                      placeholder={selectOptions.length ? 'Select GSTIN' : 'Add GST registration first'}
                      className="h-8 text-sm"
                      disabled={disabled || selectOptions.length === 0}
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleEdit(row.id)}
                        aria-label={`Edit branch ${index + 1}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete branch ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No branches configured yet.
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Multiple branches can share the same GSTIN. Add a branch-specific GSTIN in Tax & Registration first, then select it here.
      </p>
    </div>
  );
};

export default OrgBranchesSection;
