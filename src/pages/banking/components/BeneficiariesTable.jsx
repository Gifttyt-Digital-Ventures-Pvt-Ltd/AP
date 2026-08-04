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
  { key: "status", title: "Status" },
  { key: "actions", title: "Actions" },
];

const BeneficiariesTable = ({ beneficiaries = [], onRegister, canManage = false, footer = null }) => {
  const renderRow = (bene, rowIndex, headers) => (
    <TableRow key={bene.id ?? bene.bnfId ?? rowIndex}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
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
          tableHeader={beneficiariesTableHeader}
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
