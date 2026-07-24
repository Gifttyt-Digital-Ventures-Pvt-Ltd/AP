export const getAnalyticsJob = (entry) => {
  if (!entry || typeof entry !== 'object') return {};
  const layer = entry.response ?? entry.data ?? entry;
  if (layer?.response && typeof layer.response === 'object' && !Array.isArray(layer.response)) {
    return layer.response;
  }
  return layer ?? {};
};

export const getAnalyticsStatus = (job) => String(job?.status || '').toUpperCase();

export const isAnalyticsJobTerminal = (job) => ['COMPLETED', 'FAILED'].includes(getAnalyticsStatus(job));

export const getAnalyticsJobId = (job) => job?.jobId ?? job?.job_id ?? job?.id ?? '';

export const getAnalyticsDocumentUrl = (job) => job?.documentUrl ?? job?.document_url ?? '';

export const isRetryableAnalyticsPollError = (error) => {
  const status = Number(error?.status ?? error?.originalStatus ?? 0);
  if (!status) return true;
  if (status === 404 || status === 408 || status === 429) return true;
  return status >= 500;
};

/** Latest in-progress job from paginated history (rows assumed newest-first). */
export const findLatestProcessingAnalyticsJob = (historyRows = []) => {
  if (!Array.isArray(historyRows)) return null;

  for (const row of historyRows) {
    const job = getAnalyticsJob(row);
    if (getAnalyticsStatus(job) !== 'PROCESSING') continue;
    const jobId = getAnalyticsJobId(job);
    if (!jobId) continue;
    return { job, jobId };
  }

  return null;
};
