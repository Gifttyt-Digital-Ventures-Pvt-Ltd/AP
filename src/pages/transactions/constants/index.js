export const TRANSACTION_TYPES = [
  "Bill Payment",
  "Expenses",
  "Other Income",
  "Invoice Receipt",
  "Transfer",
  "Salary",
  "Tax Payment",
  "Refund",
];

export const STATEMENT_UPLOAD_ACCEPT =
  ".pdf,.xls,.xlsx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const STATEMENT_UPLOAD_EXTENSIONS = new Set(["pdf", "xls", "xlsx"]);

export const isValidStatementUploadFile = (file) => {
  if (!file) return false;
  const extension = String(file.name || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  return extension ? STATEMENT_UPLOAD_EXTENSIONS.has(extension) : false;
};

export const BANK_OPTIONS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Yes Bank",
];
