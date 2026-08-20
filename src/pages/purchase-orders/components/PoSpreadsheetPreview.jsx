import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "@e965/xlsx";
import { FileSpreadsheet, Loader2, Maximize2 } from "lucide-react";
import { Button } from "../../../components/ui/button";

const MAX_PREVIEW_ROWS = 60;
const MAX_PREVIEW_COLUMNS = 16;

const readWorkbookRows = async (file) => {
  const fileName = file?.name || "";
  const isCsv = fileName.toLowerCase().endsWith(".csv") || file?.type?.includes("csv");
  const data = isCsv ? await file.text() : await file.arrayBuffer();
  const workbook = isCsv
    ? XLSX.read(data, { type: "string" })
    : XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return { sheetName: "", rows: [] };

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: "",
  });

  return { sheetName, rows };
};

const normalizeCellValue = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
};

const PoSpreadsheetPreview = ({ file, fileURL }) => {
  const [preview, setPreview] = useState({ sheetName: "", rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!file) return;
      setLoading(true);
      setError("");
      try {
        const result = await readWorkbookRows(file);
        if (cancelled) return;
        setPreview(result);
      } catch (err) {
        if (cancelled) return;
        setPreview({ sheetName: "", rows: [] });
        setError("Could not preview this spreadsheet");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [file]);

  const previewRows = useMemo(
    () => preview.rows.slice(0, MAX_PREVIEW_ROWS),
    [preview.rows],
  );
  const columnCount = useMemo(
    () =>
      Math.min(
        Math.max(...previewRows.map((row) => row.length), 0),
        MAX_PREVIEW_COLUMNS,
      ),
    [previewRows],
  );
  const columns = useMemo(
    () => Array.from({ length: columnCount }, (_, index) => index),
    [columnCount],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-gray-100">
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-700">
            {file?.name || "Spreadsheet"}
          </p>
          <p className="text-xs text-muted-foreground">
            {preview.sheetName || "First sheet"} · showing up to {MAX_PREVIEW_ROWS} rows
          </p>
        </div>
        {fileURL ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(fileURL, "_blank")}
            title="Open original file"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-white p-3 scrollbar-thin-muted">
        {loading ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="mb-3 h-8 w-8 animate-spin" />
            <p className="text-sm">Loading spreadsheet preview...</p>
          </div>
        ) : error ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-muted-foreground">
            <FileSpreadsheet className="mb-3 h-10 w-10 opacity-60" />
            <p className="text-sm font-medium">{error}</p>
            <p className="mt-1 max-w-xs text-xs">
              Backend extraction can still process the uploaded file if the format is supported.
            </p>
          </div>
        ) : previewRows.length ? (
          <table className="min-w-full border-collapse text-xs">
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-muted/40" : undefined}>
                  {columns.map((columnIndex) => (
                    <td
                      key={`${rowIndex}-${columnIndex}`}
                      className="max-w-[220px] whitespace-nowrap border border-border px-2 py-1.5 text-left align-top"
                      title={normalizeCellValue(row[columnIndex])}
                    >
                      <span className="block truncate">
                        {normalizeCellValue(row[columnIndex]) || "\u00a0"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center text-muted-foreground">
            <FileSpreadsheet className="mb-3 h-10 w-10 opacity-60" />
            <p className="text-sm font-medium">No spreadsheet rows found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoSpreadsheetPreview;
