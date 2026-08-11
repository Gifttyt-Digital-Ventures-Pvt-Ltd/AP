import React from "react";
import { X } from "lucide-react";
import AppSelect from "../../../../components/common/AppSelect";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { VENDOR_FIELD_SECTIONS } from "../../../../utils/vendorFieldConfig";

const ACCOUNT_TYPE_OPTIONS = [
  { value: "Savings", label: "Savings" },
  { value: "Current", label: "Current" },
  { value: "Other", label: "Other" },
];

const BANK_ACTIVE_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export const createEmptyBankAccount = () => ({
  id: `vendor-bank-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  bankName: "",
  accountName: "",
  accountNumber: "",
  accountType: "",
  ifscCode: "",
  swiftCode: "",
  bankCurrency: "",
  isActive: true,
  bankContactDetails: "",
  bankAddress: "",
});

const normalizeBankAccounts = (accounts = []) =>
  (Array.isArray(accounts) ? accounts : []).map((account) => ({
    ...account,
    id: account.id || `vendor-bank-${Math.random().toString(36).slice(2, 9)}`,
  }));

const getActiveBankAccounts = (accounts = []) =>
  normalizeBankAccounts(accounts).filter((account) =>
    [
      account.bankName,
      account.accountName,
      account.accountNumber,
      account.accountType,
      account.ifscCode,
      account.swiftCode,
      account.bankCurrency,
      account.bankContactDetails,
      account.bankAddress,
    ].some((value) => String(value ?? "").trim()),
  );

export const validateVendorBankAccounts = (
  bankAccounts = [],
  { foreignVendor = false, isRequired = () => false } = {},
) => {
  const rows = getActiveBankAccounts(bankAccounts);

  for (const [index, row] of rows.entries()) {
    const label = rows.length > 1 ? `Bank account ${index + 1}` : "Bank account";
    const bankCurrency = String(row.bankCurrency || "").trim().toUpperCase();
    const requiredFields = [
      [isRequired(VENDOR_FIELD_SECTIONS.BANK_NAME), row.bankName, "Bank name"],
      [isRequired(VENDOR_FIELD_SECTIONS.ACCOUNT_NAME), row.accountName, "Account name"],
      [isRequired(VENDOR_FIELD_SECTIONS.ACCOUNT_NUMBER), row.accountNumber, "Account number"],
      [
        isRequired(VENDOR_FIELD_SECTIONS.IFSC_CODE) || bankCurrency === "INR",
        row.ifscCode,
        "IFSC code",
      ],
      [foreignVendor, row.swiftCode, "Swift code"],
    ];

    const missingField = requiredFields.find(
      ([required, value]) => required && !String(value ?? "").trim(),
    );
    if (missingField) return `${label}: ${missingField[2]} is required.`;
  }

  return "";
};

const VendorBankDetailsEditor = ({
  bankAccounts = [],
  onChange,
  foreignVendor = false,
  isRequired = () => false,
}) => {
  const rows = normalizeBankAccounts(bankAccounts);

  const updateRow = (id, field, value) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No bank details added for this vendor.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {rows.map((row, index) => {
        const ifscRequired =
          isRequired(VENDOR_FIELD_SECTIONS.IFSC_CODE) ||
          String(row.bankCurrency || "").trim().toUpperCase() === "INR";
        const swiftRequired = foreignVendor;

        return (
        <div
          key={row.id}
          className="w-full rounded-lg border border-border bg-muted/20 p-4"
          data-testid={`vendor-bank-account-row-${index}`}
        >
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label>
                  Bank Name{isRequired(VENDOR_FIELD_SECTIONS.BANK_NAME) ? " *" : ""}
                </Label>
                <Input
                  value={row.bankName || ""}
                  onChange={(event) => updateRow(row.id, "bankName", event.target.value)}
                  placeholder="e.g., HDFC Bank"
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>
                  Account Name{isRequired(VENDOR_FIELD_SECTIONS.ACCOUNT_NAME) ? " *" : ""}
                </Label>
                <Input
                  value={row.accountName || ""}
                  onChange={(event) => updateRow(row.id, "accountName", event.target.value)}
                  placeholder="e.g., Acme Corporation"
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>
                  Account No.{isRequired(VENDOR_FIELD_SECTIONS.ACCOUNT_NUMBER) ? " *" : ""}
                </Label>
                <Input
                  value={row.accountNumber || ""}
                  onChange={(event) => updateRow(row.id, "accountNumber", event.target.value)}
                  placeholder="e.g., 000123456789"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label>Account Type</Label>
                <AppSelect
                  value={row.accountType || ""}
                  onChange={(event) => updateRow(row.id, "accountType", event.target.value)}
                  options={ACCOUNT_TYPE_OPTIONS}
                  placeholder="Select Account Type"
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>IFSC Code{ifscRequired ? " *" : ""}</Label>
                <Input
                  value={row.ifscCode || ""}
                  onChange={(event) => updateRow(row.id, "ifscCode", event.target.value.toUpperCase())}
                  placeholder="e.g., HDFC0001234"
                  className="mt-1.5 uppercase"
                  required={ifscRequired}
                />
              </div>
              <div className="flex-1">
                <Label>Swift Code{swiftRequired ? " *" : ""}</Label>
                <Input
                  value={row.swiftCode || ""}
                  onChange={(event) => updateRow(row.id, "swiftCode", event.target.value.toUpperCase())}
                  placeholder="e.g., HDFCINBB"
                  className="mt-1.5 uppercase"
                  required={swiftRequired}
                />
              </div>
            </div>

            <div className="flex w-full items-start gap-4">
              <div className="flex-1">
                <Label>Bank Currency</Label>
                <Input
                  value={row.bankCurrency || ""}
                  onChange={(event) =>
                    updateRow(row.id, "bankCurrency", event.target.value.toUpperCase())
                  }
                  placeholder="e.g., INR"
                  className="mt-1.5 uppercase"
                  maxLength={3}
                />
              </div>
              <div className="flex-1">
                <Label>Bank Active Status</Label>
                <AppSelect
                  value={row.isActive ? "Active" : "Inactive"}
                  onChange={(event) => updateRow(row.id, "isActive", event.target.value === "Active")}
                  options={BANK_ACTIVE_STATUS_OPTIONS}
                  className="mt-1.5"
                />
              </div>
              <div className="flex-1">
                <Label>Bank Contact Details</Label>
                <Input
                  value={row.bankContactDetails || ""}
                  onChange={(event) => updateRow(row.id, "bankContactDetails", event.target.value)}
                  placeholder="e.g., +91 22 1234 5678"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="w-full">
              <Label>Bank Address</Label>
              <Input
                value={row.bankAddress || ""}
                onChange={(event) => updateRow(row.id, "bankAddress", event.target.value)}
                placeholder="Bank address"
                className="mt-1.5"
              />
            </div>

            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                className="flex items-center gap-1 text-xs font-medium text-destructive"
                aria-label={`Delete bank account ${index + 1}`}
              >
                <X className="h-4 w-4" />
                Remove
              </button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default VendorBankDetailsEditor;
