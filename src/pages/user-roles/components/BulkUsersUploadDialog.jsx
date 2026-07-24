import React, { useCallback, useEffect, useState } from "react";
import * as XLSX from "@e965/xlsx";
import { AlertCircle, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Separator } from "../../../components/ui/separator";
import FileUploader from "../../../components/common/FileUploader";

export const USER_UPLOAD_HEADERS = [
  "name",
  "email",
  "mobile",
  "employeeCode",
  "grade",
  "department",
  "role",
];

export const USER_UPLOAD_HEADER_MAP = {
  name: "Full Name",
  email: "Email Address",
  mobile: "Mobile Number",
  employeeCode: "Employee ID",
  grade: "Grade",
  department: "Department",
  role: "Designation",
};

const OPTIONAL_USER_UPLOAD_FIELDS = ["employeeCode", "grade", "department", "role"];

const UploadErrorsPanel = ({ errors = [] }) => {
  if (!errors.length) return null;

  return (
    <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-red-200 bg-red-50" role="alert">
      <div className="flex items-center gap-2 px-4 py-3 text-red-700">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">Upload needs attention</p>
      </div>
      <Separator className="bg-red-100" />
      <ul className="space-y-1 px-4 py-3">
        {errors.map((error, index) => (
          <li key={`${error}-${index}`} className="text-xs leading-relaxed text-red-900">
            {error}
          </li>
        ))}
      </ul>
    </div>
  );
};

const downloadTemplate = () => {
  const headerRow = USER_UPLOAD_HEADERS.map((header) => USER_UPLOAD_HEADER_MAP[header]);
  const guideRows = [
    ["Parameter", "Type"],
    ["Full Name", "Required"],
    ["Email Address", "Required. Must be a valid email address"],
    ["Mobile Number", "Required. Enter exactly 10 digits"],
    ["Employee ID", "Optional"],
    ["Grade", "Optional"],
    ["Department", "Optional"],
    ["Designation", "Optional"],
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headerRow]), "Sheet1");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(guideRows), "Guide");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "User_Upload_Format.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const validateUserUploadRow = (row, rowIndex) => {
  const errors = [];
  const email = String(row.email || "").trim();
  const mobile = String(row.mobile || "").trim();

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(`Row ${rowIndex + 2}: Email Address is invalid`);
  }

  if (mobile && !/^\d{10}$/.test(mobile)) {
    errors.push(`Row ${rowIndex + 2}: Mobile Number must be exactly 10 digits`);
  }

  return errors;
};

const BulkUsersUploadDialog = ({ open, onOpenChange, onDataParsed, disabled = false }) => {
  const [uploadErrors, setUploadErrors] = useState([]);

  useEffect(() => {
    if (!open) setUploadErrors([]);
  }, [open]);

  const handleDataParsed = useCallback(
    async (rows, file) => {
      if (typeof onDataParsed !== "function") return;

      setUploadErrors([]);
      const result = await onDataParsed(rows, file);
      if (Array.isArray(result?.errors) && result.errors.length > 0) {
        setUploadErrors(result.errors);
      }
    },
    [onDataParsed],
  );

  const handleClearFile = (clearSelectedFile) => {
    clearSelectedFile();
    setUploadErrors([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        data-testid="bulk-users-upload-dialog"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Multiple User Upload</DialogTitle>
          <DialogDescription>
            Fill the required user fields in the template, then upload your spreadsheet below.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-5">
          <FileUploader
            key={open ? "bulk-users-upload-open" : "bulk-users-upload-closed"}
            acceptedExtensions={["xlsx", "xls", "csv"]}
            expectedHeaders={USER_UPLOAD_HEADERS}
            uploadHeaderMap={USER_UPLOAD_HEADER_MAP}
            nonMandatoryFields={OPTIONAL_USER_UPLOAD_FIELDS}
            customValidation={validateUserUploadRow}
            onDataParsed={handleDataParsed}
            onErrors={setUploadErrors}
            disabled={disabled}
          >
            {({ clearSelectedFile, fileName, isParsing, isDragging, getDropZoneProps }) => (
              <div className="space-y-3">
                <div
                  {...getDropZoneProps()}
                  data-testid="bulk-users-upload-dropzone"
                  aria-label="Upload users spreadsheet"
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
                    isDragging ? "border-primary bg-primary/10" : "border-[#6311CB] bg-[#3725EA26]"
                  } ${disabled || isParsing ? "pointer-events-none opacity-60" : ""}`}
                >
                  <Upload className="h-8 w-8 text-primary" />
                  {fileName ? (
                    <p className="mb-0 flex items-center gap-1 text-sm font-medium text-foreground">
                      {fileName}
                      <button
                        type="button"
                        aria-label="Remove file"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          handleClearFile(clearSelectedFile);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </p>
                  ) : null}
                  <p className="mb-0 text-lg font-medium text-primary">
                    {isParsing || disabled ? "Processing..." : "Upload spreadsheet"}
                  </p>
                  {!isParsing && !disabled ? (
                    <p className="mb-0 text-sm text-muted-foreground">
                      Click to upload or drag and drop the file
                    </p>
                  ) : null}
                  <p className="mb-0 text-xs text-muted-foreground">
                    Supported formats: xlsx, xls, csv
                  </p>
                </div>

                <p className="rounded-sm bg-muted px-2 py-1 text-sm text-muted-foreground">
                  Download a{" "}
                  <button
                    type="button"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                    onClick={downloadTemplate}
                  >
                    sample spreadsheet
                  </button>{" "}
                  to quickly start your import. Required columns: Full Name,
                  Email Address, Mobile Number.
                </p>

                <UploadErrorsPanel errors={uploadErrors} />
              </div>
            )}
          </FileUploader>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUsersUploadDialog;
