export function isDuplicateInvoiceMessage(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('already exists') || text.includes('duplicate');
}

export function isDuplicateInvoiceError(error) {
  if (!error) return false;
  if (error.status === 409 || error.originalStatus === 409) return true;
  return (
    isDuplicateInvoiceMessage(error?.data?.message) ||
    isDuplicateInvoiceMessage(error?.data?.detail)
  );
}

export function isDuplicateBulkExtractResult(result) {
  if (!result) return false;

  const statusCode =
    result.statusCode ?? result.status_code ?? result.httpStatus ?? result.code;
  if (Number(statusCode) === 409) return true;

  const status = String(result.status || '').toLowerCase();
  if (status === 'duplicate' || status === 'conflict') return true;

  return (
    isDuplicateInvoiceMessage(result.error) ||
    isDuplicateInvoiceMessage(result.message)
  );
}

export function isDuplicateBulkPreviewItem(item) {
  if (!item) return false;
  if (item.isDuplicate) return true;
  const status = String(item.status || '').toLowerCase();
  if (status === 'duplicate') return true;
  return isDuplicateInvoiceMessage(item.error);
}
