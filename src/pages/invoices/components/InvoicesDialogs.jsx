import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import BulkExtractLoaderDialog from './BulkExtractLoaderDialog';
import BulkPreviewDialog from './BulkPreviewDialog';
import BulkEditDialog from './BulkEditDialog';
import ViewDialog from './ViewDialog';
import EditDialog from './EditDialog';
import RequestVendorDialog from './RequestVendorDialog';

const InvoicesDialogs = (props) => {
  const {
    bulkExtracting,
    bulkExtractTotalFiles,
    bulkExtractProgress,
    bulkExtractElapsedSeconds,
    formatDuration,
    bulkPreviewOpen,
    bulkCreating,
    bulkAddingVendorItemId,
    bulkPreviewItems,
    bulkProgress,
    bulkElapsedSeconds,
    formatBulkStatusLabel,
    getBulkStatusBadgeClass,
    setBulkPreviewOpen,
    setBulkPreviewItems,
    handleAddVendorForBulkItem,
    openBulkEditDialog,
    handleCreateBulkInvoices,
    departments,
    getDepartmentNameById,
    invoiceCategories,
    getCategoryNameById,
    isCategoryFeatureEnabled,
    invoiceMandatoryFields,
    bulkEditOpen,
    setBulkEditOpen,
    bulkEditForm,
    setBulkEditForm,
    bulkEditItemId,
    bulkEditFileURL,
    pdfZoom,
    bulkEditPreviewError,
    setBulkEditPreviewError,
    saveBulkEditChanges,
    renderPdfPreview,
    renderBulkEditInvoiceForm,
    viewDialogOpen,
    setViewDialogOpen,
    selectedInvoice,
    viewPreviewError,
    setViewPreviewError,
    getStatusBadgeClass,
    viewTab,
    setViewTab,
    invoiceHistory,
    loadingHistory,
    canEdit,
    handleEditInvoice,
    findVendorByName,
    findVendorById,
    editDialogOpen,
    setEditDialogOpen,
    formData,
    handleUpdateInvoice,
    handleForwardSavedInvoice,
    canForwardSavedDraft,
    forwardSavedInvoiceLoading,
    renderInvoiceForm,
    requestVendorOpen,
    handleRequestVendorOpenChange,
    requestVendorForm,
    setRequestVendorForm,
    handleSubmitVendorRequest,
    requestVendorLoading,
    invoiceDeleteTarget,
    setInvoiceDeleteTarget,
    confirmDeleteInvoice,
  } = props;

  return (
    <>
      <BulkExtractLoaderDialog
        open={bulkExtracting}
        totalFiles={bulkExtractTotalFiles}
        progress={bulkExtractProgress}
        elapsedSeconds={bulkExtractElapsedSeconds}
        formatDuration={formatDuration}
      />

      <BulkPreviewDialog
        open={bulkPreviewOpen}
        bulkCreating={bulkCreating}
        bulkPreviewItems={bulkPreviewItems}
        bulkProgress={bulkProgress}
        bulkElapsedSeconds={bulkElapsedSeconds}
        formatDuration={formatDuration}
        setBulkPreviewOpen={setBulkPreviewOpen}
        handleCreateBulkInvoices={handleCreateBulkInvoices}
      />

      <BulkEditDialog
        open={bulkEditOpen}
        setOpen={setBulkEditOpen}
        bulkCreating={bulkCreating}
        bulkEditForm={bulkEditForm}
        setBulkEditForm={setBulkEditForm}
        bulkEditItemId={bulkEditItemId}
        bulkPreviewItems={bulkPreviewItems}
        bulkEditFileURL={bulkEditFileURL}
        pdfZoom={pdfZoom}
        bulkEditPreviewError={bulkEditPreviewError}
        setBulkEditPreviewError={setBulkEditPreviewError}
        saveBulkEditChanges={saveBulkEditChanges}
        renderPdfPreview={renderPdfPreview}
        renderBulkEditInvoiceForm={renderBulkEditInvoiceForm}
      />

      <ViewDialog
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
        selectedInvoice={selectedInvoice}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        getStatusBadgeClass={getStatusBadgeClass}
        viewTab={viewTab}
        setViewTab={setViewTab}
        invoiceHistory={invoiceHistory}
        loadingHistory={loadingHistory}
        canEdit={canEdit}
        handleEditInvoice={handleEditInvoice}
        showCategoryField={isCategoryFeatureEnabled}
        isCategoryFeatureEnabled={isCategoryFeatureEnabled}
        findVendorByName={findVendorByName}
        findVendorById={findVendorById}
      />

      <EditDialog
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        selectedInvoice={selectedInvoice}
        formData={formData}
        handleUpdateInvoice={handleUpdateInvoice}
        handleForwardSavedInvoice={handleForwardSavedInvoice}
        canForwardSavedDraft={canForwardSavedDraft}
        forwardSavedInvoiceLoading={forwardSavedInvoiceLoading}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        renderInvoiceForm={renderInvoiceForm}
      />

      <RequestVendorDialog
        open={requestVendorOpen}
        onOpenChange={handleRequestVendorOpenChange}
        formData={requestVendorForm}
        setFormData={setRequestVendorForm}
        onSubmit={handleSubmitVendorRequest}
        submitting={requestVendorLoading}
      />

      <AlertDialog
        open={Boolean(invoiceDeleteTarget)}
        onOpenChange={(open) => !open && setInvoiceDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoiceDeleteTarget?.invoiceNumber}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteInvoice}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InvoicesDialogs;
