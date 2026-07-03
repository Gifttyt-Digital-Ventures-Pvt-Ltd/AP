import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import AppSelect from '../../../components/common/AppSelect';
import { createEmptyOrganisationBranch } from '../../../utils/organisationGst';

const getGridColumns = (showAreaField) =>
  showAreaField
    ? 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_48px]'
    : 'md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.4fr)_48px]';

const OrgBranchesSection = ({ branches = [], gstOptions = [], onChange, showAreaField = false }) => {
  const rows = Array.isArray(branches) ? branches : [];
  const selectOptions = gstOptions.map((gstin) => ({ value: gstin, label: gstin }));
  const gridColumns = getGridColumns(showAreaField);

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

  return (
    <div className="w-full max-w-full overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm">
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

      <div className="w-full max-w-full overflow-hidden rounded-lg border border-border">
        <div
          className={`hidden border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground md:grid md:gap-3 ${gridColumns}`}
        >
          <div>Branch Name</div>
          <div>Branch Code</div>
          {showAreaField ? <div>Area of Branch (Sq/ft)</div> : null}
          <div>Billing GSTIN</div>
          <div />
        </div>

        {rows.length > 0 ? (
          <div className="divide-y divide-border">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className={`grid grid-cols-1 gap-3 px-3 py-3 md:items-center md:gap-3 ${gridColumns}`}
                data-testid={`org-branch-row-${index}`}
              >
                <div className="min-w-0 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground md:sr-only">
                    Branch Name
                  </span>
                  <Input
                    value={row.branchName || ''}
                    onChange={(event) => updateRow(row.id, 'branchName', event.target.value)}
                    placeholder="Branch name"
                    className="h-8 w-full min-w-0 text-sm"
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground md:sr-only">
                    Branch Code
                  </span>
                  <Input
                    value={row.branchCode || ''}
                    onChange={(event) => updateRow(row.id, 'branchCode', event.target.value)}
                    placeholder="BR-001"
                    className="h-8 w-full min-w-0 text-sm"
                  />
                </div>
                {showAreaField ? (
                  <div className="min-w-0 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground md:sr-only">
                      Area of Branch (Sq/ft)
                    </span>
                    <Input
                      type="number"
                      min="0"
                      value={row.areaSqft ?? ''}
                      onChange={(event) => updateRow(row.id, 'areaSqft', event.target.value)}
                      placeholder="1200"
                      className="h-8 w-full min-w-0 text-sm"
                    />
                  </div>
                ) : null}
                <div className="min-w-0 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground md:sr-only">
                    Billing GSTIN
                  </span>
                  <AppSelect
                    value={row.billingGstin || ''}
                    onChange={(event) => updateRow(row.id, 'billingGstin', event.target.value)}
                    options={selectOptions}
                    placeholder={
                      selectOptions.length ? 'Select GSTIN' : 'Add GST registration first'
                    }
                    className="h-8 w-full min-w-0 text-sm"
                    disabled={selectOptions.length === 0}
                  />
                </div>
                <div className="flex items-center md:justify-start">
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
            ))}
          </div>
        ) : (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            No branches configured yet.
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Multiple branches can share the same GSTIN. Add a branch-specific GSTIN in Tax & Registration first, then select it here.
      </p>
    </div>
  );
};

export default OrgBranchesSection;
