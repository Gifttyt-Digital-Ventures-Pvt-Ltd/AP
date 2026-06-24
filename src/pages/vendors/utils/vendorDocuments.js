export const VENDOR_DOCUMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp';
export const VENDOR_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const VENDOR_DOCUMENT_TYPES = [
  { key: 'pan', label: 'PAN Document' },
  { key: 'gst', label: 'GST Document' },
  { key: 'coi', label: 'Certificate of Incorporation (COI)' },
  { key: 'cancelCheque', label: 'Cancelled Cheque' },
  { key: 'msmeCertificate', label: 'MSME Certificate' },
  { key: 'moa', label: 'Memorandum of Association (MOA)' },
  { key: 'aoa', label: 'Articles of Association (AOA)' },
];

const DOCUMENT_KEY_ALIASES = {
  pan: ['pan', 'panDocument', 'pan_document'],
  gst: ['gst', 'gstDocument', 'gst_document'],
  coi: ['coi', 'coiDocument', 'coi_document', 'certificateOfIncorporation'],
  cancelCheque: ['cancelCheque', 'cancel_cheque', 'cancelledCheque', 'cancelled_cheque'],
  msmeCertificate: ['msmeCertificate', 'msme_certificate', 'msmeCert'],
  moa: ['moa', 'moaDocument', 'moa_document'],
  aoa: ['aoa', 'aoaDocument', 'aoa_document'],
};

export const createEmptyVendorDocuments = () =>
  Object.fromEntries(VENDOR_DOCUMENT_TYPES.map(({ key }) => [key, null]));

const normalizeDocumentEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const fileName = String(entry.fileName || entry.file_name || entry.name || '').trim();
  if (!fileName) return null;

  return {
    fileName,
    fileSize: Number(entry.fileSize ?? entry.file_size ?? entry.size ?? 0) || 0,
    mimeType: String(entry.mimeType || entry.mime_type || entry.type || '').trim(),
    uploadedAt: entry.uploadedAt || entry.uploaded_at || entry.createdAt || entry.created_at || null,
  };
};

export const normalizeVendorDocuments = (documents = {}) => {
  const empty = createEmptyVendorDocuments();
  if (!documents || typeof documents !== 'object') return empty;

  VENDOR_DOCUMENT_TYPES.forEach(({ key }) => {
    const aliases = DOCUMENT_KEY_ALIASES[key] || [key];
    for (const alias of aliases) {
      const normalized = normalizeDocumentEntry(documents[alias]);
      if (normalized) {
        empty[key] = normalized;
        break;
      }
    }
  });

  return empty;
};

export const createVendorDocumentMeta = (file) => ({
  fileName: file.name,
  fileSize: file.size,
  mimeType: file.type,
  uploadedAt: new Date().toISOString(),
});

export const getVendorDocumentValidationError = (file) => {
  if (!file) return 'No file selected';

  const extension = String(file.name || '')
    .toLowerCase()
    .split('.')
    .pop();
  const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
  if (!allowed.includes(extension)) {
    return 'Upload a PDF or image file (.pdf, .png, .jpg, .jpeg, .webp)';
  }

  if (file.size > VENDOR_DOCUMENT_MAX_BYTES) {
    return 'File must be 10 MB or smaller';
  }

  return null;
};

export const sanitizeVendorDocumentsForSave = (documents = {}) => {
  const normalized = normalizeVendorDocuments(documents);
  return Object.fromEntries(
    Object.entries(normalized).map(([key, value]) => {
      if (!value) return [key, null];
      const { _file, ...meta } = value;
      return [key, meta];
    }),
  );
};

export const countVendorDocuments = (documents = {}) =>
  Object.values(normalizeVendorDocuments(documents)).filter(Boolean).length;

export const formatVendorDocumentSize = (bytes = 0) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
