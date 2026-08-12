import React from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import VendorBankDetailsEditor, { createEmptyBankAccount } from "./VendorBankDetailsEditor";

const BankDetailsSection = ({
  bankAccounts,
  onChange,
  foreignVendor = false,
  isRequired,
  onVerifyBankAccount,
  isBankVerifying = false,
}) => (
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
      <div className="flex w-full items-center gap-6">
        <div className="flex-1">
          <div className="flex flex-col items-start self-stretch">
            <h4 className="font-['Manrope'] text-base font-semibold leading-5 text-foreground">
              Vendor Bank Details
            </h4>
            <p className="pt-0.5 text-xs leading-4 text-muted-foreground">
              Add one or more bank accounts. The first active account is used for payments by
              default.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={() => onChange([...(bankAccounts || []), createEmptyBankAccount()])}
        >
          <Plus className="h-4 w-4" />
          Add Bank Details
        </Button>
      </div>

      <VendorBankDetailsEditor
        bankAccounts={bankAccounts}
        onChange={onChange}
        foreignVendor={foreignVendor}
        isRequired={isRequired}
        onVerifyBankAccount={onVerifyBankAccount}
        isBankVerifying={isBankVerifying}
      />
    </div>
  </div>
);

export default BankDetailsSection;
