import React from "react";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import BeneficiaryStatusBadge from "./BeneficiaryStatusBadge";

const beneficiariesTableHeader = [
  { key: "name", title: "Name", cellClassName: "font-medium" },
  { key: "accountNumber", title: "Account" },
  { key: "ifsc", title: "IFSC" },
  { key: "status", title: "Status" },
  { key: "actions", title: "Actions" },
];

const BeneficiariesTable = ({ beneficiaries = [], onRegister, canManage = false }) => {
  const renderRow = (bene, rowIndex, headers) => (
    <TableRow key={bene.bnfId ?? rowIndex}>
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
              bene.status === "FAILED" && canManage ? (
                <Button size="sm" variant="outline" onClick={() => onRegister?.(bene)}>
                  Retry
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
    <AppDataTable
      tableHeader={beneficiariesTableHeader}
      tableData={beneficiaries}
      renderRow={renderRow}
      emptyMessage="No beneficiaries registered yet"
    />
  );
};

export default BeneficiariesTable;
