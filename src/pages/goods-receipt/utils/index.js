import { GRN_SOURCE, GRN_STATUS } from '../constants';
import { buildGrnConfigSnapshot } from './grnFormatConfig';
import { extractListResponse } from '../../../Services/utils/payloadMappers';

export const getListData = extractListResponse;

export const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const normalizeGrnStatus = (status = '') => {
  const value = String(status || '').trim();
  if (!value) return GRN_STATUS.DRAFT;
  if (value === 'Draft') return GRN_STATUS.DRAFT;
  if (value === 'Posted' || value === 'Approved') return GRN_STATUS.APPROVED;
  if (value === 'Pending Approval') return GRN_STATUS.PENDING_APPROVAL;
  if (value === 'Sent Back') return GRN_STATUS.SENT_BACK;
  if (value === 'Rejected') return GRN_STATUS.REJECTED;
  if (value === 'Cancelled') return GRN_STATUS.CANCELLED;
  return value.toUpperCase().replace(/\s+/g, '_');
};

export const getGrnStatusLabel = (status) => {
  const normalized = normalizeGrnStatus(status);
  const labels = {
    [GRN_STATUS.DRAFT]: 'Draft',
    [GRN_STATUS.PENDING_APPROVAL]: 'Pending Approval',
    [GRN_STATUS.SENT_BACK]: 'Sent Back',
    [GRN_STATUS.APPROVED]: 'Approved',
    [GRN_STATUS.REJECTED]: 'Rejected',
    [GRN_STATUS.CANCELLED]: 'Cancelled',
  };
  return labels[normalized] || status || 'Draft';
};

export const normalizeGrnSource = (grn = {}) => {
  const raw =
    grn.source_type ??
    grn.sourceType ??
    grn.source ??
    '';
  if (raw) {
    const upper = String(raw).toUpperCase().replace(/\s+/g, '_');
    if (upper === 'FROM_PI' || upper === 'FROMPI') return GRN_SOURCE.FROM_PI;
    if (upper === 'STANDALONE') return GRN_SOURCE.STANDALONE;
    if (upper === 'UPLOAD' || upper === 'UPLOADED') return GRN_SOURCE.UPLOAD;
    if (upper === 'PO') return GRN_SOURCE.PO;
  }
  if (grn.pi_id ?? grn.piId) return GRN_SOURCE.FROM_PI;
  if (grn.source_document_id ?? grn.sourceDocumentId) return GRN_SOURCE.UPLOAD;
  if (grn.po_id ?? grn.poId) return GRN_SOURCE.PO;
  return GRN_SOURCE.STANDALONE;
};

export const normalizeGrnLineItem = (item = {}) => ({
  ...item,
  id: item.id,
  line_number: item.line_number ?? item.lineNumber,
  po_line_item_id: item.po_line_item_id ?? item.poLineItemId,
  item_code: item.item_code ?? item.itemCode ?? '',
  item_description:
    item.item_description ?? item.itemDescription ?? item.description ?? '',
  hsn_sac: item.hsn_sac ?? item.hsnSac ?? item.hsn_sac_code ?? '',
  uom: item.uom ?? item.unit_of_measure ?? item.unitOfMeasure ?? '',
  ordered_quantity: Number(item.ordered_quantity ?? item.orderedQuantity ?? item.ordered_qty ?? 0),
  already_received: Number(
    item.already_received ?? item.alreadyReceived ?? item.prev_received_qty ?? 0,
  ),
  pending_quantity: Number(item.pending_quantity ?? item.pendingQuantity ?? 0),
  received_quantity: Number(item.received_quantity ?? item.receivedQuantity ?? item.received_qty ?? 0),
  accepted_quantity: Number(item.accepted_quantity ?? item.acceptedQuantity ?? 0),
  rejected_quantity: Number(item.rejected_quantity ?? item.rejectedQuantity ?? 0),
  rejection_reason: item.rejection_reason ?? item.rejectionReason ?? '',
  batch_no: item.batch_no ?? item.batchNo ?? '',
  line_amount: Number(item.line_amount ?? item.lineAmount ?? item.amount ?? 0),
  unit_price: Number(item.unit_price ?? item.unitPrice ?? 0),
});

export const normalizeGrn = (grn = {}) => ({
  ...grn,
  id: grn.id ?? grn.grnId ?? grn.grn_id,
  grn_number: grn.grn_number ?? grn.grnNumber ?? '',
  po_id: grn.po_id ?? grn.poId ?? '',
  po_number: grn.po_number ?? grn.poNumber ?? '',
  vendor_id: grn.vendor_id ?? grn.vendorId ?? '',
  vendor_name: grn.vendor_name ?? grn.vendorName ?? '',
  receipt_date: grn.receipt_date ?? grn.receiptDate ?? grn.grn_date ?? grn.grnDate ?? '',
  source_type: normalizeGrnSource(grn),
  status: normalizeGrnStatus(grn.status),
  line_items: Array.isArray(grn.line_items)
    ? grn.line_items.map(normalizeGrnLineItem)
    : Array.isArray(grn.lineItems)
      ? grn.lineItems.map(normalizeGrnLineItem)
      : [],
  total_received_value: Number(grn.total_received_value ?? grn.totalReceivedValue ?? 0),
  delivery_note_number:
    grn.delivery_note_number ??
    grn.deliveryNoteNumber ??
    grn.delivery_challan_no ??
    grn.deliveryChallanNo ??
    '',
  delivery_challan_no:
    grn.delivery_challan_no ?? grn.deliveryChallanNo ?? grn.delivery_note_number ?? '',
  eway_bill_no: grn.eway_bill_no ?? grn.ewayBillNo ?? '',
  vehicle_number: grn.vehicle_number ?? grn.vehicleNumber ?? grn.vehicle_no ?? grn.vehicleNo ?? '',
  transporter_name: grn.transporter_name ?? grn.transporterName ?? '',
  lr_number: grn.lr_number ?? grn.lrNumber ?? '',
  received_at_location: grn.received_at_location ?? grn.receivedAtLocation ?? '',
  received_by: grn.received_by ?? grn.receivedBy ?? '',
  received_by_name: grn.received_by_name ?? grn.receivedByName ?? '',
  inspected_by: grn.inspected_by ?? grn.inspectedBy ?? '',
  remarks: grn.remarks ?? '',
  reject_reason: grn.reject_reason ?? grn.rejectReason ?? grn.rejected_reason ?? '',
  send_back_reason:
    grn.send_back_reason ??
    grn.sendBackReason ??
    grn.sent_back_reason ??
    grn.sentBackReason ??
    '',
  created_at: grn.created_at ?? grn.createdAt ?? '',
  created_by_name: grn.created_by_name ?? grn.createdByName ?? '',
  submitted_by_name: grn.submitted_by_name ?? grn.submittedByName ?? '',
  approved_by_name: grn.approved_by_name ?? grn.approvedByName ?? '',
});

export const normalizePoLineItem = (item = {}) => ({
  ...item,
  id: item.id ?? item.po_line_item_id ?? item.poLineItemId,
  item_description: item.item_description ?? item.description ?? '',
  unit_of_measure: item.unit_of_measure ?? item.uom ?? 'NOS',
  unit_price: Number(item.unit_price ?? item.unitPrice ?? 0),
  quantity: Number(item.quantity ?? 0),
  received_quantity: Number(item.received_quantity ?? item.receivedQuantity ?? 0),
});

export const normalizePurchaseOrder = (po = {}) => ({
  ...po,
  id: po.id ?? po.po_id ?? po.poId,
  po_number: po.po_number ?? po.poNumber ?? '',
  vendor_id: po.vendor_id ?? po.vendorId ?? '',
  vendor_name: po.vendor_name ?? po.vendorName ?? '',
  po_date: po.po_date ?? po.poDate ?? '',
  total_amount: Number(po.total_amount ?? po.totalAmount ?? 0),
  status: po.status ?? '',
  shipping_address: po.shipping_address ?? po.shippingAddress ?? '',
  line_items: Array.isArray(po.line_items)
    ? po.line_items.map(normalizePoLineItem)
    : Array.isArray(po.lineItems)
      ? po.lineItems.map(normalizePoLineItem)
      : [],
});

export const normalizePoLineReceiptState = (line = {}) => {
  const ordered = Number(
    line.ordered_qty ??
      line.orderedQty ??
      line.ordered_quantity ??
      line.orderedQuantity ??
      line.quantity ??
      0,
  );
  const already = Number(
    line.received_qty ??
      line.receivedQty ??
      line.already_received ??
      line.alreadyReceived ??
      line.received_quantity ??
      line.receivedQuantity ??
      0,
  );
  const pendingFromApi = Number(
    line.pending_qty ?? line.pendingQty ?? line.pending_quantity ?? line.pendingQuantity,
  );
  const pending = Number.isFinite(pendingFromApi)
    ? pendingFromApi
    : Math.max(ordered - already, 0);

  return {
    po_line_item_id: line.po_line_item_id ?? line.poLineItemId ?? line.id,
    item_code: line.item_code ?? line.itemCode ?? '',
    item_description:
      line.item_description ?? line.description ?? line.itemDescription ?? '',
    hsn_sac: line.hsn_sac ?? line.hsn_sac_code ?? line.hsnSac ?? '',
    uom: line.uom ?? line.unit_of_measure ?? line.unitOfMeasure ?? 'NOS',
    ordered_quantity: ordered,
    already_received: already,
    pending_quantity: pending,
    unit_price: Number(line.unit_price ?? line.unitPrice ?? 0),
  };
};

export const buildGrnLineItemsFromPo = (po, receiptStateLines = null) => {
  const receiptLines = Array.isArray(receiptStateLines) ? receiptStateLines : null;
  const sourceLines = receiptLines?.length
    ? receiptLines.map(normalizePoLineReceiptState)
    : (po?.line_items || []).map((item) =>
        normalizePoLineReceiptState({
          ...item,
          po_line_item_id: item.id,
          ordered_qty: item.quantity,
          received_qty: item.received_quantity,
        }),
      );

  return sourceLines.map((line) => {
    const pending = Number(line.pending_quantity) || 0;
    const receivedDefault = pending > 0 ? pending : 0;

    return {
      po_line_item_id: line.po_line_item_id,
      item_code: line.item_code ?? '',
      item_description: line.item_description ?? '',
      hsn_sac: line.hsn_sac ?? '',
      uom: line.uom ?? 'NOS',
      ordered_quantity: line.ordered_quantity,
      already_received: line.already_received,
      pending_quantity: pending,
      received_quantity: receivedDefault,
      accepted_quantity: receivedDefault,
      rejected_quantity: 0,
      rejection_reason: '',
      unit_price: line.unit_price,
    };
  });
};

export const getPoReceiptStateLines = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.lines)) return response.lines;
  if (Array.isArray(response?.line_items)) return response.line_items;
  if (Array.isArray(response?.lineItems)) return response.lineItems;
  if (Array.isArray(response?.data?.lines)) return response.data.lines;
  return [];
};

export const createEmptyGrnLineItem = () => ({
  item_code: '',
  item_description: '',
  hsn_sac: '',
  uom: 'NOS',
  ordered_quantity: 0,
  already_received: 0,
  pending_quantity: 0,
  received_quantity: 0,
  accepted_quantity: 0,
  rejected_quantity: 0,
  rejection_reason: '',
  batch_no: '',
  unit_price: 0,
});

export const createDefaultGrnForm = (grnFormatId = '') => ({
  source_type: GRN_SOURCE.PO,
  grn_format_id: grnFormatId,
  po_id: '',
  vendor_id: '',
  receipt_date: new Date().toISOString().split('T')[0],
  received_at_location: '',
  delivery_note_number: '',
  delivery_challan_no: '',
  eway_bill_no: '',
  vehicle_number: '',
  transporter_name: '',
  lr_number: '',
  received_by: '',
  remarks: '',
  requires_vendor: false,
  line_items: [],
});

export const validateGrnLineItems = (lineItems, { qcEnabled = true } = {}) => {
  const activeLines = lineItems.filter((item) => Number(item.received_quantity) > 0);
  if (activeLines.length === 0) {
    return 'Enter received quantity for at least one line';
  }

  for (const item of activeLines) {
    const received = Number(item.received_quantity) || 0;
    const accepted = Number(item.accepted_quantity) || 0;
    const rejected = Number(item.rejected_quantity) || 0;

    if (qcEnabled && accepted + rejected !== received) {
      return `Accepted + Rejected must equal Received for ${item.item_description || 'line item'}`;
    }
    if (qcEnabled && rejected > 0 && !String(item.rejection_reason || '').trim()) {
      return `Rejection reason required for ${item.item_description || 'line item'}`;
    }
  }

  return null;
};

export const buildCreateGrnPayload = (form, { formatConfig, qcEnabled = true } = {}) => {
  const lineItems = form.line_items
    .filter((item) => Number(item.received_quantity) > 0)
    .map((item) => ({
      po_line_item_id: item.po_line_item_id || undefined,
      item_description: item.item_description || undefined,
      item_code: item.item_code || undefined,
      hsn_sac: item.hsn_sac || undefined,
      uom: item.uom || undefined,
      received_quantity: item.received_quantity,
      accepted_quantity: qcEnabled ? item.accepted_quantity : item.received_quantity,
      rejected_quantity: qcEnabled ? item.rejected_quantity : 0,
      rejection_reason: qcEnabled ? item.rejection_reason : '',
      batch_no: item.batch_no || undefined,
    }));

  const resolvedFormatId = form.grn_format_id || formatConfig?.id;

  return {
    source_type: form.source_type,
    grn_format_id: resolvedFormatId || undefined,
    template_code: formatConfig?.templateCode || formatConfig?.template_code || undefined,
    config_snapshot: formatConfig ? buildGrnConfigSnapshot(formatConfig) : undefined,
    po_id: form.po_id || undefined,
    vendor_id: form.vendor_id || undefined,
    receipt_date: form.receipt_date,
    received_at_location: form.received_at_location || undefined,
    delivery_note_number: form.delivery_note_number || form.delivery_challan_no || undefined,
    delivery_challan_no: form.delivery_challan_no || form.delivery_note_number || undefined,
    eway_bill_no: form.eway_bill_no || undefined,
    transporter_name: form.transporter_name || undefined,
    vehicle_number: form.vehicle_number || undefined,
    lr_number: form.lr_number || undefined,
    received_by: form.received_by || undefined,
    remarks: form.remarks || undefined,
    line_items: lineItems,
  };
};
