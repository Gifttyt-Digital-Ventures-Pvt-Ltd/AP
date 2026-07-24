import { useState } from 'react';
import { ChevronLeft, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import MeteredActionCostHint from '../../../components/credits/MeteredActionCostHint';
import { CREDIT_ACTION_CODES } from '../../../constants/creditActions';

const ScanningOverlay = () => (
  <div
    className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
    data-testid="grn-scanning-overlay"
  >
    <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
    <p className="text-sm font-medium text-primary">Extracting GRN details...</p>
    <p className="mt-1 text-xs text-muted-foreground">
      Please wait while AI reads your goods receipt note
    </p>
  </div>
);

const GrnUploadSection = ({
  uploadedFile,
  onClose,
  renderDocumentPreview,
  scanning,
  renderGrnForm,
  onSaveDraft,
  onSubmit,
  saving = false,
  submitLabel = 'Submit GRN',
  grnUploadEstimateDisabled = false,
}) => {
  const [previewOpen, setPreviewOpen] = useState(true);

  if (!uploadedFile) return null;

  return (
    <Dialog open={Boolean(uploadedFile)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        fullscreen
        hideClose
        overlayClassName="bg-black/80"
        data-testid="upload-grn-dialog"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Upload & Scan GRN</DialogTitle>
        </DialogHeader>

        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b bg-gray-50 px-4 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-1 text-gray-600 hover:text-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="truncate text-sm font-semibold">
                Review Uploaded GRN - {uploadedFile?.name || 'Document'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen((value) => !value)}
                className="ml-1 h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                title={previewOpen ? 'Hide preview' : 'Show preview'}
              >
                {previewOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                <span className="hidden sm:inline">{previewOpen ? 'Hide Preview' : 'Show Preview'}</span>
              </Button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full min-h-0 overflow-hidden">
              <div
                className={`min-h-0 flex-shrink-0 overflow-hidden border-r transition-all duration-300 ease-in-out ${
                  previewOpen ? 'w-[35%]' : 'w-0 border-r-0'
                }`}
              >
                {renderDocumentPreview()}
              </div>

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {!scanning ? (
                  <>
                    <div className="min-h-0 flex-1 overflow-y-auto p-4">
                      {renderGrnForm()}
                    </div>
                    <div className="shrink-0 border-t bg-white px-4 py-4">
                      <MeteredActionCostHint
                        actionCode={CREDIT_ACTION_CODES.GRN_UPLOAD}
                        className="mb-3"
                      />
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          onClick={onSaveDraft}
                          className="flex-1"
                          disabled={saving || grnUploadEstimateDisabled}
                          data-testid="save-draft-grn-upload-btn"
                        >
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Save as Draft
                        </Button>
                        <Button
                          onClick={onSubmit}
                          className="flex-1"
                          disabled={saving || grnUploadEstimateDisabled}
                          data-testid="submit-grn-upload-btn"
                        >
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {submitLabel}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            {scanning ? <ScanningOverlay /> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GrnUploadSection;
