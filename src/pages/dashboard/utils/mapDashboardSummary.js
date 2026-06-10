function pick(obj, snakeKey, camelKey, fallback = undefined) {
  if (!obj) return fallback;
  if (obj[snakeKey] !== undefined && obj[snakeKey] !== null) return obj[snakeKey];
  if (obj[camelKey] !== undefined && obj[camelKey] !== null) return obj[camelKey];
  return fallback;
}

function normalizePaymentBatches(raw) {
  if (!raw) return null;

  const pendingCount =
    pick(raw, 'pending_count', 'pendingCount', null) ??
    (typeof raw.pending === 'object' && raw.pending !== null
      ? raw.pending.count
      : raw.pending) ??
    0;

  return {
    enabled: pick(raw, 'enabled', 'enabled', true),
    total_batches: pick(raw, 'total_batches', 'totalBatches', 0),
    pending: { count: pendingCount },
    completed: {
      count: pick(raw, 'completed_count', 'completedCount', 0),
      amount: pick(raw, 'completed_amount', 'completedAmount', 0),
    },
  };
}

export function mapDashboardSummary(response) {
  if (!response) return null;

  const payload =
    response.stats || response.charts || response.header
      ? response
      : response.data ?? response;

  if (!payload) return null;

  const statsRaw = payload.stats ?? {};
  const paymentProgressRaw = payload.payment_progress ?? payload.paymentProgress ?? {};
  const chartsRaw = payload.charts ?? {};
  const bottleneckRaw = payload.bottleneck ?? {};
  const headerRaw = payload.header ?? {};

  const stats = {
    total_invoices: pick(statsRaw, 'total_invoices', 'totalInvoices', 0),
    pending_approvals: pick(statsRaw, 'pending_approvals', 'pendingApprovals', 0),
    paid_invoices: pick(statsRaw, 'paid_invoices', 'paidInvoices', 0),
    approved_invoices: pick(statsRaw, 'approved_invoices', 'approvedInvoices', 0),
    pending_payment_invoices: pick(
      statsRaw,
      'pending_payment_invoices',
      'pendingPaymentInvoices',
      0,
    ),
    vendors_count: pick(statsRaw, 'vendors_count', 'vendorsCount', 0),
    total_amount: pick(statsRaw, 'total_amount', 'totalAmount', 0),
    paid_amount: pick(statsRaw, 'paid_amount', 'paidAmount', 0),
    pending_amount: pick(statsRaw, 'pending_amount', 'pendingAmount', 0),
    completion_rate: pick(statsRaw, 'completion_rate', 'completionRate', null),
  };

  const paidAmount = pick(paymentProgressRaw, 'paid_amount', 'paidAmount', stats.paid_amount);
  const totalAmount = pick(paymentProgressRaw, 'total_amount', 'totalAmount', stats.total_amount);
  const pendingAmount = pick(
    paymentProgressRaw,
    'pending_amount',
    'pendingAmount',
    stats.pending_amount,
  );
  const paidPercentage = pick(paymentProgressRaw, 'paid_percentage', 'paidPercentage', null);

  const stages = bottleneckRaw.stages ?? bottleneckRaw.bottleneck_analysis ?? [];

  return {
    header: {
      corporate_name: pick(headerRaw, 'corporate_name', 'corporateName', ''),
      user_name: pick(headerRaw, 'user_name', 'userName', ''),
    },
    stats,
    paymentProgress: {
      paid_amount: paidAmount,
      total_amount: totalAmount,
      pending_amount: pendingAmount,
      paid_percentage: paidPercentage,
    },
    charts: {
      monthly_trend: chartsRaw.monthly_trend ?? chartsRaw.monthlyTrend ?? [],
      status_distribution: chartsRaw.status_distribution ?? chartsRaw.statusDistribution ?? [],
      top_vendors: chartsRaw.top_vendors ?? chartsRaw.topVendors ?? [],
    },
    bottleneck: {
      avg_processing_days: pick(
        bottleneckRaw,
        'avg_processing_days',
        'avgProcessingDays',
        0,
      ),
      stages: Array.isArray(stages)
        ? stages.map((stage) => ({
            stage: stage.stage ?? stage.name ?? '',
            count: stage.count ?? stage.value ?? 0,
          }))
        : [],
    },
    recent_invoices: payload.recent_invoices ?? payload.recentInvoices ?? [],
    pending_your_approval: payload.pending_your_approval ?? payload.pendingYourApproval ?? [],
    payment_batches: normalizePaymentBatches(
      payload.payment_batches ?? payload.paymentBatches,
    ),
  };
}
