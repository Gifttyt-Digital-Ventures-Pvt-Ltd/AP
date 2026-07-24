import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  useFetchGstr2aAnalyticsReconciliationHistoryMutation,
  useFetchGstr2bAnalyticsReconciliationHistoryMutation,
  useGetGstr2aAnalyticsReconciliationJobMutation,
  useGetGstr2bAnalyticsReconciliationJobMutation,
} from '../../../Services/apis/taxApi';
import { getApiErrorMessage } from '../hooks/useGstTaxpayerSession';
import {
  findLatestProcessingAnalyticsJob,
  getAnalyticsJob,
  getAnalyticsJobId,
  getAnalyticsStatus,
  isAnalyticsJobTerminal,
  isRetryableAnalyticsPollError,
} from '../utils/gstAnalyticsReconciliation';

const GST_RECONCILIATION_POLL_MS = 30000;
const GST_RECONCILIATION_PAGE_SIZE = 20;

const GstAnalyticsReconciliationContext = createContext(null);

export const GstAnalyticsReconciliationProvider = ({ children, enabled = true }) => {
  const [activeJobsByType, setActiveJobsByType] = useState({ '2a': null, '2b': null });
  const [historyRefreshTick, setHistoryRefreshTick] = useState({ '2a': 0, '2b': 0 });
  const pendingByTypeRef = useRef({ '2a': null, '2b': null });
  const pollTimeoutsRef = useRef(new Map());
  const pollFailCountsRef = useRef(new Map());
  const pollJobRef = useRef(null);
  const hasInitializedRef = useRef(false);

  const [getGstr2aJob] = useGetGstr2aAnalyticsReconciliationJobMutation();
  const [getGstr2bJob] = useGetGstr2bAnalyticsReconciliationJobMutation();
  const [fetchGstr2aHistory] = useFetchGstr2aAnalyticsReconciliationHistoryMutation();
  const [fetchGstr2bHistory] = useFetchGstr2bAnalyticsReconciliationHistoryMutation();

  const setActiveJobForType = useCallback((type, job) => {
    setActiveJobsByType((prev) => ({ ...prev, [type]: job }));
  }, []);

  const setPendingJobForType = useCallback((type, jobId, job = null) => {
    if (!type || !jobId) return;
    pendingByTypeRef.current[type] = { jobId, job };
  }, []);

  const clearPendingJobForType = useCallback((type) => {
    if (!type) {
      pendingByTypeRef.current = { '2a': null, '2b': null };
      return;
    }
    pendingByTypeRef.current[type] = null;
  }, []);

  const clearPoll = useCallback((jobId) => {
    const timer = pollTimeoutsRef.current.get(jobId);
    if (timer) clearTimeout(timer);
    pollTimeoutsRef.current.delete(jobId);
  }, []);

  const clearAllPolls = useCallback(() => {
    pollTimeoutsRef.current.forEach((timer) => clearTimeout(timer));
    pollTimeoutsRef.current.clear();
  }, []);

  const fetchHistoryRows = useCallback(async (type, page = 1) => {
    const offset = (page - 1) * GST_RECONCILIATION_PAGE_SIZE;
    const result = type === '2a'
      ? await fetchGstr2aHistory({ limit: GST_RECONCILIATION_PAGE_SIZE, offset }).unwrap()
      : await fetchGstr2bHistory({ limit: GST_RECONCILIATION_PAGE_SIZE, offset }).unwrap();
    return Array.isArray(result) ? result : [];
  }, [fetchGstr2aHistory, fetchGstr2bHistory]);

  const schedulePoll = useCallback((jobId, type) => {
    if (!jobId) return;
    clearPoll(jobId);
    const timer = setTimeout(() => pollJobRef.current?.(jobId, type), GST_RECONCILIATION_POLL_MS);
    pollTimeoutsRef.current.set(jobId, timer);
  }, [clearPoll]);

  const pollJob = useCallback(async (jobId, type) => {
    if (!jobId || !type) return;
    try {
      clearPoll(jobId);
      const result = type === '2a'
        ? await getGstr2aJob(jobId).unwrap()
        : await getGstr2bJob(jobId).unwrap();
      const job = getAnalyticsJob(result);
      const status = getAnalyticsStatus(job);
      pollFailCountsRef.current.delete(jobId);
      setActiveJobForType(type, job);

      if (!isAnalyticsJobTerminal(job)) {
        setPendingJobForType(type, jobId, job);
        schedulePoll(jobId, type);
        return;
      }

      clearPendingJobForType(type);
      const typeLabel = type === '2a' ? 'GSTR-2A' : 'GSTR-2B';
      if (status === 'COMPLETED') {
        toast.success(`${typeLabel} reconciliation report is ready.`);
      } else if (status === 'FAILED') {
        toast.error(job?.failureMessage || `${typeLabel} reconciliation failed.`);
      }
      setHistoryRefreshTick((prev) => ({ ...prev, [type]: (prev[type] ?? 0) + 1 }));
    } catch (error) {
      const httpStatus = Number(error?.status ?? error?.originalStatus ?? 0);
      const failCount = (pollFailCountsRef.current.get(jobId) ?? 0) + 1;
      pollFailCountsRef.current.set(jobId, failCount);

      if (httpStatus === 404 && failCount >= 5) {
        clearPendingJobForType(type);
        clearPoll(jobId);
        pollFailCountsRef.current.delete(jobId);
        setActiveJobForType(type, null);
        toast.error('Reconciliation job not found. Please generate a new report.');
        return;
      }

      if (isRetryableAnalyticsPollError(error)) {
        schedulePoll(jobId, type);
        return;
      }

      clearPendingJobForType(type);
      clearPoll(jobId);
      setActiveJobForType(type, null);
      toast.error(getApiErrorMessage(error));
    }
  }, [
    clearPendingJobForType,
    clearPoll,
    getGstr2aJob,
    getGstr2bJob,
    schedulePoll,
    setActiveJobForType,
    setPendingJobForType,
  ]);

  const startPollingJob = useCallback((type, jobId, job = null) => {
    if (!type || !jobId) return;
    if (job) {
      setActiveJobForType(type, job);
    }
    setPendingJobForType(type, jobId, job);
    pollJob(jobId, type);
  }, [pollJob, setActiveJobForType, setPendingJobForType]);

  const resumePendingJob = useCallback((type, historyRows = []) => {
    const inMemoryPending = pendingByTypeRef.current[type];
    if (inMemoryPending?.jobId) {
      if (inMemoryPending.job) {
        setActiveJobForType(type, getAnalyticsJob(inMemoryPending.job));
      }
      pollJob(inMemoryPending.jobId, type);
      return;
    }

    const fromHistory = findLatestProcessingAnalyticsJob(historyRows);
    if (fromHistory?.jobId) {
      startPollingJob(type, fromHistory.jobId, fromHistory.job);
    }
  }, [pollJob, setActiveJobForType, startPollingJob]);

  useEffect(() => {
    pollJobRef.current = pollJob;
  }, [pollJob]);

  useEffect(() => {
    if (!enabled) return undefined;
    return () => clearAllPolls();
  }, [clearAllPolls, enabled]);

  useEffect(() => {
    if (!enabled || hasInitializedRef.current) return undefined;

    let cancelled = false;
    hasInitializedRef.current = true;

    const resumeAllPendingJobs = async () => {
      for (const type of ['2a', '2b']) {
        try {
          const rows = await fetchHistoryRows(type, 1);
          if (cancelled) return;
          resumePendingJob(type, rows);
        } catch {
          // Background resume should not block the GST section.
        }
      }
    };

    resumeAllPendingJobs();
    return () => {
      cancelled = true;
    };
  }, [enabled, fetchHistoryRows, resumePendingJob]);

  useEffect(() => {
    if (!enabled) {
      hasInitializedRef.current = false;
      clearAllPolls();
      setActiveJobsByType({ '2a': null, '2b': null });
      pendingByTypeRef.current = { '2a': null, '2b': null };
    }
  }, [clearAllPolls, enabled]);

  const value = useMemo(() => ({
    activeJobsByType,
    historyRefreshTick,
    setActiveJobForType,
    startPollingJob,
    clearPendingJobForType,
    fetchHistoryRows,
  }), [
    activeJobsByType,
    clearPendingJobForType,
    fetchHistoryRows,
    historyRefreshTick,
    setActiveJobForType,
    startPollingJob,
  ]);

  return (
    <GstAnalyticsReconciliationContext.Provider value={value}>
      {children}
    </GstAnalyticsReconciliationContext.Provider>
  );
};

export const useGstAnalyticsReconciliation = () => {
  const context = useContext(GstAnalyticsReconciliationContext);
  if (!context) {
    throw new Error('useGstAnalyticsReconciliation must be used within GstAnalyticsReconciliationProvider');
  }
  return context;
};
