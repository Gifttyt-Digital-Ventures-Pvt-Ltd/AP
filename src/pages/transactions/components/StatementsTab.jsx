import React from "react";
import { Building2, Calendar, Download, FileText, Search, Trash2, Upload } from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { TabsContent } from "../../../components/ui/tabs";

const StatementsTab = ({
  selectedBank,
  setSelectedBank,
  BANK_OPTIONS,
  periodStart,
  setPeriodStart,
  periodEnd,
  setPeriodEnd,
  fileInputRef,
  handleFileUpload,
  uploading,
  isDragOverUploadZone,
  handleUploadZoneDragOver,
  handleUploadZoneDragLeave,
  handleUploadZoneDrop,
  statements,
  searchTerm,
  setSearchTerm,
  accountFilter,
  setAccountFilter,
  statusFilter,
  setStatusFilter,
  getStatusBadge,
  handleDownloadStatement,
  handleDeleteStatement,
}) => {
  return (
    <TabsContent value="upload" className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Select Bank</label>
            <select value={selectedBank} onChange={(e) => setSelectedBank(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" data-testid="bank-select">
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Period Start</label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="h-9" data-testid="period-start" />
          </div>
          <div>
            <label className="text-xs text-gray-600 mb-1 block">Period End</label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="h-9" data-testid="period-end" />
          </div>
          <div className="flex items-end">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.csv,.xlsx" className="hidden" data-testid="file-input" />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading || !periodStart || !periodEnd} className="w-full h-9" data-testid="upload-btn">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Statement
                </>
              )}
            </Button>
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragOverUploadZone ? "border-primary bg-gray-50" : "border-gray-200 hover:border-primary hover:bg-gray-50"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleUploadZoneDragOver}
          onDragEnter={handleUploadZoneDragOver}
          onDragLeave={handleUploadZoneDragLeave}
          onDrop={handleUploadZoneDrop}
        >
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600">
            Drop your files or <span className="text-blue-600 font-medium">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Supported format: pdf, csv, xlsx</p>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input placeholder="File name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 w-40 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Pick a date range</span>
          </div>
          <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)} className="h-8 rounded border px-2 text-sm">
            <option value="">Accounts</option>
            {BANK_OPTIONS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded border px-2 text-sm">
            <option value="">Status</option>
            <option value="Extracted">Extracted</option>
            <option value="Processing">Processing</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left font-medium text-gray-600">Period Date</th>
              <th className="p-3 text-left font-medium text-gray-600">File Name</th>
              <th className="p-3 text-left font-medium text-gray-600">Account</th>
              <th className="p-3 text-left font-medium text-gray-600">Status</th>
              <th className="p-3 text-center font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {statements.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No statements uploaded yet</p>
                </td>
              </tr>
            ) : (
              statements
                .filter((s) => !statusFilter || s.status === statusFilter)
                .filter((s) => !accountFilter || s.bank_name === accountFilter)
                .map((stmt) => (
                  <tr key={stmt.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <span className="text-gray-800">{format(new Date(stmt.period_start), "d MMM yyyy")} - {format(new Date(stmt.period_end), "d MMM yyyy")}</span>
                    </td>
                    <td className="p-3"><span className="text-gray-800">{stmt.original_file_name}</span></td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span>{stmt.bank_name}</span>
                      </div>
                    </td>
                    <td className="p-3">{getStatusBadge(stmt.status)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleDownloadStatement(stmt.id)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700" title="Download">
                          <Download className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteStatement(stmt.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>

        {statements.length > 0 && (
          <div className="p-3 border-t flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select className="border rounded px-2 py-1 text-sm">
                <option>10</option>
                <option>25</option>
                <option>50</option>
              </select>
            </div>
            <span>1 - {statements.length} of {statements.length}</span>
          </div>
        )}
      </div>
    </TabsContent>
  );
};

export default StatementsTab;
