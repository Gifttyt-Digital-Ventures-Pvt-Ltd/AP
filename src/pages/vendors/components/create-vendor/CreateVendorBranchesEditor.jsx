import React from "react";
import { X } from "lucide-react";
import AppSelect from "../../../../components/common/AppSelect";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { normalizeFormGstRegistrations } from "../../utils/vendorGstRegistrations";
import { normalizeVendorBranches } from "../../utils/vendorBranches";

const CreateVendorBranchesEditor = ({ branches = [], gstRegistrations = [], onChange }) => {
  const rows = normalizeVendorBranches(branches);
  const gstOptions = normalizeFormGstRegistrations(gstRegistrations)
    .map((registration) => registration.gstin)
    .filter(Boolean)
    .map((gstin) => ({ value: gstin, label: gstin }));

  const updateRow = (id, field, value) => {
    onChange(
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === "branchCode" || field === "gstin"
                  ? String(value || "").toUpperCase()
                  : value,
            }
          : row,
      ),
    );
  };

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No vendor branches configured yet.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {rows.map((row, index) => (
        <div
          key={row.id}
          className="w-full rounded-lg border border-border bg-muted/20 p-4"
          data-testid={`vendor-branch-row-${index}`}
        >
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label>Branch Name *</Label>
                <Input
                  value={row.branchName || ""}
                  onChange={(event) => updateRow(row.id, "branchName", event.target.value)}
                  placeholder="e.g., Mumbai HO"
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>Branch Code</Label>
                <Input
                  value={row.branchCode || ""}
                  onChange={(event) => updateRow(row.id, "branchCode", event.target.value)}
                  placeholder="e.g., MUM01"
                  className="mt-1.5 uppercase"
                />
              </div>
              <div className="flex-1">
                <Label>Map GSTIN</Label>
                <AppSelect
                  value={row.gstin || ""}
                  onChange={(event) => updateRow(row.id, "gstin", event.target.value)}
                  options={gstOptions}
                  placeholder={gstOptions.length ? "Select GSTIN added above" : "Add GSTIN first"}
                  className="mt-1.5"
                  disabled={gstOptions.length === 0}
                />
              </div>
            </div>

            <div className="w-full">
              <Label>Address Line 1 *</Label>
              <Input
                value={row.addressLine1 || ""}
                onChange={(event) => updateRow(row.id, "addressLine1", event.target.value)}
                placeholder="Address line 1"
                className="mt-1.5"
              />
            </div>

            <div className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label>Address Line 2</Label>
                <Input
                  value={row.addressLine2 || ""}
                  onChange={(event) => updateRow(row.id, "addressLine2", event.target.value)}
                  placeholder="Address line 2"
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>City *</Label>
                <Input
                  value={row.city || ""}
                  onChange={(event) => updateRow(row.id, "city", event.target.value)}
                  placeholder="e.g., Mumbai"
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>District</Label>
                <Input
                  value={row.district || ""}
                  onChange={(event) => updateRow(row.id, "district", event.target.value)}
                  placeholder="e.g., Mumbai Suburban"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label>State *</Label>
                <Input
                  value={row.state || ""}
                  onChange={(event) => updateRow(row.id, "state", event.target.value)}
                  placeholder="e.g., Maharashtra"
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>Pincode *</Label>
                <Input
                  value={row.pincode || ""}
                  onChange={(event) => updateRow(row.id, "pincode", event.target.value)}
                  placeholder="e.g., 400001"
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>Country</Label>
                <Input
                  value={row.country || "India"}
                  onChange={(event) => updateRow(row.id, "country", event.target.value)}
                  placeholder="Country"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                className="flex items-center gap-1 text-xs font-medium text-destructive"
                aria-label={`Delete vendor branch ${index + 1}`}
              >
                <X className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CreateVendorBranchesEditor;
