import React from 'react';
import InvoicesTable from './InvoicesTable';
import UploadSection from './UploadSection';

const InvoicesWorkspace = ({
  uploadedFile,
  setUploadedFile,
  setUploadedFileURL,
  setFormData,
  setActiveTab,
  renderPdfPreview,
  uploadedFileURL,
  pdfZoom,
  uploadPreviewError,
  setUploadPreviewError,
  scanning,
  renderInvoiceForm,
  handleAddInvoice,
  searchTerm,
  setSearchTerm,
  filteredInvoices,
  getStatusBadgeClass,
  handleViewInvoice,
  canEdit,
  handleEditInvoice,
  canDelete,
  handleDeleteInvoice,
}) => {
  if (uploadedFile) {
    return (
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
    );
  }

  return (
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
  );
};

export default InvoicesWorkspace;
