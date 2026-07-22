import { useEffect, useMemo, useState } from 'react';
import {
  useGetReconDetailQuery,
  useLinkReconInvoiceMutation,
  useUploadReconInvoiceMutation,
  useGetReconUploadJobStatusQuery,
  useOverrideReconMutation,
} from '../../../Services/apis/taxApi';
import { dateToApiPeriod } from '../utils/gstPeriod';

const UPLOAD_JOB_POLL_MS = 3000;
const isUploadJobTerminal = (job) => job?.state === 'DONE' || job?.state === 'FAILED';

/**
 * Orchestrates the Reconciliation View page (FE §3-§6) for a single Overview row: resolves the
 * source/period to query, fetches the detail (BE §10.3), and exposes the link/upload/override
 * mutations (BE §10.4-§10.6) used by the No-Invoice-Found and Override flows.
 *
 * `source` here is the Overview page's toggle value (`EFFECTIVE`/`SOURCE_2A`/`SOURCE_2B`); the
 * detail endpoint is source-specific, so when the toggle is `EFFECTIVE` we resolve to whichever
 * source actually produced the row's status (`row.statusSource`).
 */
export function useGstReconDetail({ row, source, enabled = true }) {
  const period = useMemo(() => dateToApiPeriod(row?.invoiceDate), [row?.invoiceDate]);
  const detailSource = source === 'EFFECTIVE' ? row?.statusSource || 'SOURCE_2A' : source;

  const detailParams = useMemo(
    () => ({
      platformInvoiceId: row?.platformInvoiceId || undefined,
      portalInvoiceId: row?.portalInvoiceId || undefined,
      source: detailSource,
      period,
    }),
    [row?.platformInvoiceId, row?.portalInvoiceId, detailSource, period],
  );

  const {
    data: detail,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetReconDetailQuery(detailParams, { skip: !enabled || !period });

  const [linkInvoice, linkResult] = useLinkReconInvoiceMutation();
  const [uploadInvoice, uploadResult] = useUploadReconInvoiceMutation();
  const [overrideRecon, overrideResult] = useOverrideReconMutation();

  // BE upload is async (202 + ingestionJobId) — poll GET /recon/upload/{jobId} until it
  // reaches a terminal state, then reload the recon detail so the new link/status shows up.
  const [uploadJobId, setUploadJobId] = useState(null);
  const { data: uploadJob } = useGetReconUploadJobStatusQuery(uploadJobId, {
    skip: !uploadJobId,
    pollingInterval: uploadJobId ? UPLOAD_JOB_POLL_MS : 0,
  });

  useEffect(() => {
    if (!uploadJob || !isUploadJobTerminal(uploadJob)) return;
    setUploadJobId(null);
    if (uploadJob.state === 'DONE') refetch();
  }, [uploadJob, refetch]);

  return {
    detail,
    isLoading: isLoading || isFetching,
    isError,
    refetch,
    period,
    source: detailSource,

    linkInvoice: (platformInvoiceId) =>
      linkInvoice({ portalInvoiceId: row?.portalInvoiceId, platformInvoiceId, source: detailSource, period }).unwrap(),
    linking: linkResult.isLoading,

    uploadInvoice: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      if (row?.portalInvoiceId) formData.append('portalInvoiceId', row.portalInvoiceId);
      formData.append('source', detailSource);
      formData.append('period', period);
      const result = await uploadInvoice(formData).unwrap();
      if (result?.ingestionJobId && !isUploadJobTerminal(result)) {
        setUploadJobId(result.ingestionJobId);
      }
      return result;
    },
    uploading: uploadResult.isLoading,
    // Polled status for the in-flight upload-and-link job (BE §4.4) — null once no job is
    // pending or after it reaches DONE/FAILED. `uploadJob.state` is PENDING/RUNNING while
    // extraction is in progress.
    uploadJob,

    // BE §10.6 requires `reconResultId`; the detail contract (§10.3) doesn't spell out where it
    // lives on the response, so this reads it defensively off `header`.
    reconResultId: detail?.header?.reconResultId ?? detail?.header?.id ?? null,
    overrideRecon: (reason) =>
      overrideRecon({
        reconResultId: detail?.header?.reconResultId ?? detail?.header?.id,
        reason,
      }).unwrap(),
    overriding: overrideResult.isLoading,
  };
}
