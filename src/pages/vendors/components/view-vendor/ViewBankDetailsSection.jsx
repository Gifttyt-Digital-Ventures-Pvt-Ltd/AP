import React from "react";
import ReadOnlyField from "./ReadOnlyField";

const ViewBankAccountsList = ({ bankAccounts = [] }) => {
  if (!bankAccounts.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No bank details added for this vendor.
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {bankAccounts.map((row, index) => (
        <div
          key={row.id || index}
          className="w-full rounded-lg border border-border bg-muted/20 p-4"
        >
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full items-start gap-4">
              <ReadOnlyField label="Bank Name" value={row.bankName} className="flex-1" />
              <ReadOnlyField label="Account Name" value={row.accountName} className="flex-1" />
              <ReadOnlyField label="Account No." value={row.accountNumber} className="flex-1" />
            </div>

            <div className="flex w-full items-start gap-4">
              <ReadOnlyField label="Account Type" value={row.accountType} className="flex-1" />
              <ReadOnlyField label="IFSC Code" value={row.ifscCode} className="flex-1" />
              <ReadOnlyField label="Swift Code" value={row.swiftCode} className="flex-1" />
            </div>

            <div className="flex w-full items-start gap-4">
              <ReadOnlyField label="Bank Currency" value={row.bankCurrency} className="flex-1" />
              <ReadOnlyField
                label="Bank Active Status"
                value={row.isActive ? "Active" : "Inactive"}
                className="flex-1"
              />
              <ReadOnlyField
                label="Bank Contact Details"
                value={row.bankContactDetails}
                className="flex-1"
              />
            </div>

            <ReadOnlyField label="Bank Address" value={row.bankAddress} className="w-full" />
          </div>
        </div>
      ))}
    </div>
  );
};

const ViewBankDetailsSection = ({ bankAccounts }) => (
  <div className="-mx-6 border-b border-border px-10">
    <div className="flex flex-col items-start self-stretch border-b border-border py-6">
      <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
        Bank Details
      </h3>
    </div>

    <div
      id="vendor-bank-details"
      className="flex scroll-mt-4 flex-col items-start gap-6 px-4 pb-8 pt-6"
    >
      <div className="flex flex-col items-start self-stretch">
        <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">
          Vendor Bank Details
        </h4>
        <p className="pt-0.5 text-xs leading-4 text-muted-foreground">
          Bank accounts on file for this vendor. The first active account is used for payments by
          default.
        </p>
      </div>

      <ViewBankAccountsList bankAccounts={bankAccounts || []} />
    </div>
  </div>
);

export default ViewBankDetailsSection;
