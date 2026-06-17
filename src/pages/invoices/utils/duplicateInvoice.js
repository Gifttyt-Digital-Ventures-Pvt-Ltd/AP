const DEFAULT_DUPLICATE_MESSAGE =
  'An invoice with the same invoice number and vendor already exists.';

export function isDuplicateInvoiceMessage(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('already exists') || text.includes('duplicate');
}

export function isDuplicateInvoiceError(error) {
  if (!error) return false;
  if (error.status === 409 || error.originalStatus === 409) return true;
  if (error?.data?.duplicate === true || error?.data?.isDuplicate === true) return true;
  return (
    isDuplicateInvoiceMessage(error?.data?.duplicateMessage) ||
    isDuplicateInvoiceMessage(error?.data?.duplicate_message) ||
    isDuplicateInvoiceMessage(error?.data?.message) ||
    isDuplicateInvoiceMessage(error?.data?.detail)
  );
}

const getNestedExtractPayload = (result) =>
  result?.extracted ??
  result?.extractedData ??
  result?.extracted_data ??
  result?.data ??
  null;

const hasDuplicateFlag = (value) =>
  value?.duplicate === true || value?.isDuplicate === true;

export function getDuplicateInvoiceMessage(result) {
  if (!result) return DEFAULT_DUPLICATE_MESSAGE;

  const nested = getNestedExtractPayload(result);
  const candidates = [result, nested].filter(
    (entry) => entry && typeof entry === 'object',
  );

  for (const entry of candidates) {
    const message =
      entry.duplicateMessage ??
      entry.duplicate_message ??
      entry.error ??
      entry.message;
    if (message) return String(message);
  }

  return DEFAULT_DUPLICATE_MESSAGE;
}

export function isDuplicateBulkExtractResult(result) {
  if (!result) return false;

  if (hasDuplicateFlag(result)) return true;

  const statusCode =
    result.statusCode ?? result.status_code ?? result.httpStatus ?? result.code;
  if (Number(statusCode) === 409) return true;

  const status = String(result.status || '').toLowerCase();
  if (status === 'duplicate' || status === 'conflict') return true;

  const nested = getNestedExtractPayload(result);
  if (nested && nested !== result && typeof nested === 'object') {
    if (hasDuplicateFlag(nested)) return true;
    const nestedStatus = String(nested.status || '').toLowerCase();
    if (nestedStatus === 'duplicate' || nestedStatus === 'conflict') return true;
  }

  return (
    isDuplicateInvoiceMessage(result.duplicateMessage) ||
    isDuplicateInvoiceMessage(result.duplicate_message) ||
    isDuplicateInvoiceMessage(result.error) ||
    isDuplicateInvoiceMessage(result.message) ||
    (nested &&
      typeof nested === 'object' &&
      (isDuplicateInvoiceMessage(nested.duplicateMessage) ||
        isDuplicateInvoiceMessage(nested.duplicate_message) ||
        isDuplicateInvoiceMessage(nested.error) ||
        isDuplicateInvoiceMessage(nested.message)))
  );
}

export function isDuplicateBulkPreviewItem(item) {
  if (!item) return false;
  if (item.isDuplicate) return true;
  const status = String(item.status || '').toLowerCase();
  if (status === 'duplicate') return true;
  return isDuplicateInvoiceMessage(item.error);
}

export function getBulkExtractResults(response) {
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response)) return response;
  return [];
}

export function normalizeBulkExtractResult(result = {}) {
  const extracted =
    result.extracted ??
    result.extractedData ??
    result.extracted_data ??
    null;

  const normalized = {
    ...result,
    status: String(result.status || '').toLowerCase(),
    extracted,
  };

  const isDuplicate = isDuplicateBulkExtractResult(normalized);

  return {
    ...normalized,
    isDuplicate,
    duplicateMessage: isDuplicate ? getDuplicateInvoiceMessage(normalized) : '',
  };
}
