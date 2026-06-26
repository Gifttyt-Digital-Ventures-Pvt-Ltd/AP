const trimId = (value) => String(value ?? '').trim();

export const emptyInvoiceMatchingFormState = () => ({
  matchingPurchaseOrderId: '',
  matchingGrnId: '',
  matchingId: '',
  existingMatchingPurchaseOrderId: '',
  existingMatchingGrnId: '',
  matchingPoNumber: '',
  matchingGrnNumber: '',
  matchingStatus: '',
});

export const resolveInvoiceMatchingFormState = (invoice = {}) => {
  const matchingPurchaseOrderId = trimId(
    invoice.poId ??
      invoice.po_id ??
      invoice.purchaseOrderId ??
      invoice.purchase_order_id ??
      invoice.matchingPurchaseOrderId,
  );
  const matchingGrnId = trimId(
    invoice.grnId ?? invoice.grn_id ?? invoice.matchingGrnId,
  );

  return {
    invoiceId: trimId(invoice.id),
    matchingId: trimId(invoice.matchingId ?? invoice.matching_id),
    matchingPurchaseOrderId,
    matchingGrnId,
    existingMatchingPurchaseOrderId: matchingPurchaseOrderId,
    existingMatchingGrnId: matchingGrnId,
    matchingPoNumber: trimId(invoice.poNumber ?? invoice.po_number),
    matchingGrnNumber: trimId(invoice.grnNumber ?? invoice.grn_number),
    matchingStatus: trimId(invoice.matchingStatus ?? invoice.matching_status),
  };
};

export const getInvoiceMatchingSelection = (formData = {}) => ({
  purchaseOrderId: trimId(formData.matchingPurchaseOrderId),
  grnId: trimId(formData.matchingGrnId),
});

export const hasInvoiceMatchingSelectionChanged = (formData = {}) => {
  const current = getInvoiceMatchingSelection(formData);
  return (
    current.purchaseOrderId !== trimId(formData.existingMatchingPurchaseOrderId) ||
    current.grnId !== trimId(formData.existingMatchingGrnId)
  );
};

export const buildInvoiceMatchingRequestBody = ({
  invoiceId,
  purchaseOrderId,
  grnId,
  canUseThreeWayMatching = false,
}) => {
  const resolvedGrnId = canUseThreeWayMatching && grnId ? grnId : null;

  return {
    invoiceId,
    purchaseOrderId,
    grnId: resolvedGrnId,
    matchType: resolvedGrnId ? 'THREE_WAY' : 'TWO_WAY',
  };
};

/**
 * Runs after invoice create/update when PO matching is enabled.
 * - Create or first-time match → POST /invoice-matching/perform
 * - Existing match unchanged → no-op
 * - Existing match changed → PUT /invoice-matching/{id}/edit
 */
export const syncInvoiceMatchingOnSave = async (
  invoiceId,
  formData = {},
  {
    skip = false,
    enabled = true,
    canUseThreeWayMatching = false,
    performInvoiceMatch,
    editInvoiceMatch,
    onError,
  } = {},
) => {
  const { purchaseOrderId, grnId } = getInvoiceMatchingSelection(formData);

  if (skip || !enabled || !purchaseOrderId) return false;

  if (!invoiceId) {
    onError?.('Invoice saved, but matching could not run because invoice id was missing');
    return false;
  }

  const matchingId = trimId(formData.matchingId);
  const selectionChanged = hasInvoiceMatchingSelectionChanged(formData);

  if (matchingId && !selectionChanged) {
    return false;
  }

  const body = buildInvoiceMatchingRequestBody({
    invoiceId,
    purchaseOrderId,
    grnId,
    canUseThreeWayMatching,
  });

  try {
    if (matchingId && selectionChanged) {
      await editInvoiceMatch({ id: matchingId, body }).unwrap();
      return 'updated';
    }

    await performInvoiceMatch(body).unwrap();
    return 'created';
  } catch (error) {
    onError?.(error);
    return false;
  }
};

export const mergeSelectedMatchingOption = (items = [], selectedId, fallback = null) => {
  const normalizedId = trimId(selectedId);
  if (!normalizedId) return items;

  const exists = items.some((item) => trimId(item?.id) === normalizedId);
  if (exists) return items;

  if (!fallback?.id) return items;
  return [fallback, ...items];
};
