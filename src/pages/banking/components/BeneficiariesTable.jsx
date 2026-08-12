import React from "react";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import BeneficiaryStatusBadge from "./BeneficiaryStatusBadge";

const beneficiariesTableHeader = [
  { key: "vendorName", title: "Vendor", cellClassName: "font-medium" },
  { key: "name", title: "Name", cellClassName: "font-medium" },
  { key: "bankName", title: "Bank" },
  { key: "accountNumber", title: "Account" },
  { key: "ifsc", title: "IFSC" },
  { key: "bankVerificationStatus", title: "Bank Verification" },
  { key: "status", title: "Status" },
  { key: "actions", title: "Actions" },
];

const BANK_VERIFICATION_STATUS_STYLES = {
  APPROVED: "border-emerald-200 bg-emerald-100 text-emerald-800",
  VERIFIED: "border-emerald-200 bg-emerald-100 text-emerald-800",
  SUCCESS: "border-emerald-200 bg-emerald-100 text-emerald-800",
  PENDING_APPROVAL: "border-amber-200 bg-amber-100 text-amber-900",
  PENDING: "border-amber-200 bg-amber-100 text-amber-900",
  REJECTED: "border-red-200 bg-red-100 text-red-800",
  FAILED: "border-red-200 bg-red-100 text-red-800",
  NOT_VERIFIED: "border-slate-200 bg-slate-100 text-slate-700",
};

const normalizeBankVerificationStatus = (status) => {
  const normalized = String(status || "").trim().toUpperCase();
  return normalized || "NOT_VERIFIED";
};

const getBankVerificationStatusLabel = (status) => {
  const normalized = normalizeBankVerificationStatus(status);
  if (["APPROVED", "VERIFIED", "SUCCESS"].includes(normalized)) return "Verified";
  if (["PENDING_APPROVAL", "PENDING"].includes(normalized)) return "Pending";
  if (["REJECTED", "FAILED"].includes(normalized)) return "Rejected";
  return "Not verified";
};

const BankVerificationStatusBadge = ({ status }) => {
  const normalized = normalizeBankVerificationStatus(status);
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        BANK_VERIFICATION_STATUS_STYLES[normalized] || BANK_VERIFICATION_STATUS_STYLES.NOT_VERIFIED
      }`}
    >
      {getBankVerificationStatusLabel(normalized)}
    </span>
  );
};

const BeneficiariesTable = ({
  beneficiaries = [],
  onRegister,
  canManage = false,
  footer = null,
  showBankVerificationStatus = false,
}) => {
  const visibleHeaders = showBankVerificationStatus
    ? beneficiariesTableHeader
    : beneficiariesTableHeader.filter((header) => header.key !== "bankVerificationStatus");

  const renderRow = (bene, rowIndex, headers) => (
    <TableRow key={bene.id ?? bene.bnfId ?? rowIndex}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "bankVerificationStatus":
            value = <BankVerificationStatusBadge status={bene.bankVerificationStatus} />;
            break;
          case "status":
            value = (
              <BeneficiaryStatusBadge status={bene.status} availableAt={bene.availableAt} />
            );
            break;
          case "actions":
            value =
              ["FAILED", "UNVERIFIED", "PENDING"].includes(String(bene.status || "").toUpperCase()) && canManage ? (
                <Button size="sm" variant="outline" onClick={() => onRegister?.(bene)}>
                  Verify
                </Button>
              ) : (
                "-"
              );
            break;
          default:
            value = bene?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="min-h-0 flex-1 overflow-x-auto">
        <AppDataTable
          tableHeader={visibleHeaders}
          tableData={beneficiaries}
          renderRow={renderRow}
          tableClassName="min-w-[980px]"
          tableContainerClassName="overflow-visible"
          headClassName="border-b border-border bg-muted shadow-sm"
          emptyMessage="No vendor bank accounts found"
          stickyHeader={false}
        />
      </div>
      {footer}
    </div>
  );
};

export default BeneficiariesTable;
