import React from "react";
import { FileText, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import InvoicesTable from "./InvoicesTable";
import UploadSection from "./UploadSection";

const InvoiceTabs = ({
  activeTab,
  setActiveTab,
  uploadedFile,
  searchTerm,
  setSearchTerm,
  filteredInvoices,
  getStatusBadgeClass,
  handleViewInvoice,
  canEdit,
  handleEditInvoice,
  canDelete,
  handleDeleteInvoice,
  setUploadedFile,
  setUploadedFileURL,
  setFormData,
  renderPdfPreview,
  uploadedFileURL,
  pdfZoom,
  uploadPreviewError,
  setUploadPreviewError,
  scanning,
  renderInvoiceForm,
  handleAddInvoice,
}) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="list" data-testid="tab-list">
          <FileText className="h-4 w-4 mr-2" />
          Invoice List
        </TabsTrigger>
        {uploadedFile && (
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Sparkles className="h-4 w-4 mr-2" />
            Upload & Scan
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="list">
        <InvoicesTable
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filteredInvoices={filteredInvoices}
          getStatusBadgeClass={getStatusBadgeClass}
          handleViewInvoice={handleViewInvoice}
          canEdit={canEdit}
          handleEditInvoice={handleEditInvoice}
          canDelete={canDelete}
          handleDeleteInvoice={handleDeleteInvoice}
        />
      </TabsContent>

      <TabsContent value="upload">
        <UploadSection
          uploadedFile={uploadedFile}
          setUploadedFile={setUploadedFile}
          setUploadedFileURL={setUploadedFileURL}
          setFormData={setFormData}
          setActiveTab={setActiveTab}
          renderPdfPreview={renderPdfPreview}
          uploadedFileURL={uploadedFileURL}
          pdfZoom={pdfZoom}
          uploadPreviewError={uploadPreviewError}
          setUploadPreviewError={setUploadPreviewError}
          scanning={scanning}
          renderInvoiceForm={renderInvoiceForm}
          handleAddInvoice={handleAddInvoice}
        />
      </TabsContent>
    </Tabs>
  );
};

export default InvoiceTabs;
