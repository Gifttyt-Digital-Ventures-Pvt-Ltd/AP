import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Button } from '../../../../components/ui/button';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useGetInvoicesQuery } from '../../../../Services/apis/invoicesVendorsApi';
import LinkExistingTaxInvoicePicker from '../../../invoices/components/LinkExistingTaxInvoicePicker';
import { getApiErrorMessage } from '../../hooks/useGstTaxpayerSession';

/**
 * FE §4 — No-Invoice-Found flow: select an existing platform invoice (§4.1, BE §10.4) or
 * upload one to create + auto-link it (§4.2, BE §10.5). Rendered inside GstReconViewPanel
 * whenever the recon status is NO_INVOICE_FOUND.
 */
const GstReconNoInvoiceFoundFlow = ({
  row,
  linkInvoice,
  linking,
  uploadInvoice,
  uploading,
  uploadJob,
  onLinked,
}) => {
  const [tab, setTab] = useState('select');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  // BE §4.4 — upload is async; `uploadJob` is polled by the parent hook and passed down here.
  // It's only ever non-null while a job is PENDING/RUNNING or on the single render where it
  // just reached a terminal state (the parent clears it right after).
  const isProcessing = Boolean(uploadJob) && uploadJob.state !== 'DONE' && uploadJob.state !== 'FAILED';

  useEffect(() => {
    if (!uploadJob) return;
    if (uploadJob.state === 'DONE') {
      toast.success('Invoice created and linked.');
      onLinked?.();
    } else if (uploadJob.state === 'FAILED') {
      toast.error(uploadJob.errorMessage || 'Invoice extraction failed.');
    }
  }, [uploadJob, onLinked]);

  const debouncedSearch = useDebouncedValue(search || row?.vendorName || '', 300);
  const { data, isFetching } = useGetInvoicesQuery({ search: debouncedSearch, limit: 20, offset: 0 });
  const invoices = data?.items ?? [];

  const handleSelect = async (invoice) => {
    setSelectedId(invoice.id);
    try {
      await linkInvoice(invoice.id);
      toast.success('Invoice linked. Reconciliation checklist re-run.');
      onLinked?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleFile = (fileList) => {
    const nextFile = fileList?.[0];
    if (nextFile) setFile(nextFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      await uploadInvoice(file);
      toast.info('Upload received — extracting invoice details…');
      setFile(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="select">Select existing</TabsTrigger>
        <TabsTrigger value="upload">Upload</TabsTrigger>
      </TabsList>

      <TabsContent value="select" className="pt-3">
        <LinkExistingTaxInvoicePicker
          invoices={invoices}
          selectedId={selectedId}
          onSelect={handleSelect}
          loading={isFetching}
          disabled={linking}
        />
        <input
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          placeholder="Search invoice no. / vendor"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </TabsContent>

      <TabsContent value="upload" className="pt-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files);
            event.target.value = '';
          }}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-primary">Extracting invoice details…</p>
            <p className="text-xs text-muted-foreground">
              This can take a moment — the invoice will link automatically once ready.
            </p>
          </div>
        ) : !file ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFile(event.dataTransfer?.files);
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-10 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'
            }`}
          >
            <Upload className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium text-primary">Upload invoice</p>
            <p className="text-xs text-muted-foreground">
              This creates a full invoice record and links it to this GST record — not a bare attachment.
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-md border p-4">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setFile(null)} disabled={uploading}>
                Remove
              </Button>
              <Button type="button" size="sm" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Upload &amp; link
              </Button>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default GstReconNoInvoiceFoundFlow;
