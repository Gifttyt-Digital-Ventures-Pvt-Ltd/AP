export const VENDOR_DOCUMENT_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp';
export const VENDOR_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

// Legacy fixed document-type catalog. No longer used to render separate upload rows (documents
// are a single generic array now), but kept for two things that still need it: the tenant-level
// "which document sections are enabled" RBAC config (src/utils/vendorDocumentConfig.js), and
// mapping an old-shape vendor record's fixed slots onto the new array shape below.
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

// documentType value each legacy slot maps onto once converted into the new array shape.
// Matches the PROPOSED contract in docs/vendor-documents-api-contract.md §1/§10.
const LEGACY_KEY_TO_DOCUMENT_TYPE = {
  pan: 'PAN',
  gst: 'GST',
  coi: 'COI',
  cancelCheque: 'CANCEL_CHEQUE',
  msmeCertificate: 'MSME_CERTIFICATE',
  moa: 'MOA',
  aoa: 'AOA',
};

/** documents now starts as an empty array — no fixed slots. */
export const createEmptyVendorDocuments = () => [];

let clientIdCounter = 0;
const generateVendorDocumentClientId = () => {
  clientIdCounter += 1;
  return `vendor-doc-${Date.now()}-${clientIdCounter}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeDocumentEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const fileName = String(entry.fileName || entry.file_name || entry.name || '').trim();
  if (!fileName) return null;

  // Display-only, human-facing URL (may be signed/expiring). Broad alias chain is fine here —
  // it's just "whichever URL-shaped field this record happens to carry."
  const downloadUrl = String(
    entry.downloadUrl ||
      entry.download_url ||
      entry.fileUrl ||
      entry.file_url ||
      entry.url ||
      entry.documentUrl ||
      entry.document_url ||
      entry.viewUrl ||
      entry.view_url ||
      entry.path ||
      '',
  ).trim();

  // Opaque backend storage reference. Backend persists exactly what it's sent back and does NOT
  // derive it from downloadUrl/fileUrl or look it up by id — so this must round-trip byte-for-byte.
  // No aliasing beyond the snake_case spelling, no trimming/coercion of the value itself, and never
  // sourced from a URL field even though today's GET may (transitionally) return the same value in
  // both fields.
  const storageKey = entry.storageKey ?? entry.storage_key ?? null;

  return {
    id: entry.id ?? entry.documentId ?? entry.document_id ?? null,
    // Frontend-only identity so a not-yet-saved document can be listed/removed before it has a
    // server id. Preserved across re-normalization (never regenerated once assigned).
    clientId: entry.clientId || entry._clientId || generateVendorDocumentClientId(),
    // Optional, never required from the user — see docs/vendor-documents-api-contract.md §1.
    documentType: entry.documentType ?? entry.document_type ?? null,
    fileName,
    fileSize: Number(entry.fileSize ?? entry.file_size ?? entry.size ?? 0) || 0,
    mimeType: String(entry.mimeType || entry.mime_type || entry.type || '').trim(),
    uploadedAt: entry.uploadedAt || entry.uploaded_at || entry.createdAt || entry.created_at || null,
    downloadUrl: downloadUrl || null,
    storageKey,
    ...(typeof File !== 'undefined' && entry._file instanceof File ? { _file: entry._file } : {}),
  };
};

/** Converts a legacy fixed-slot `{pan, gst, coi, ...}` object into the new array shape. */
const normalizeLegacyVendorDocuments = (documents) => {
  const entries = [];
  VENDOR_DOCUMENT_TYPES.forEach(({ key }) => {
    const aliases = DOCUMENT_KEY_ALIASES[key] || [key];
    for (const alias of aliases) {
      const raw = documents[alias];
      if (raw && typeof raw === 'object') {
        const normalized = normalizeDocumentEntry({
          ...raw,
          documentType: raw.documentType ?? LEGACY_KEY_TO_DOCUMENT_TYPE[key],
        });
        if (normalized) entries.push(normalized);
        break;
      }
    }
  });
  return entries;
};

/**
 * Accepts either the new array-based `documents` shape or the legacy fixed-slot object shape
 * (still returned by any vendor record the backend hasn't migrated yet — see
 * docs/vendor-documents-api-contract.md §10) and always returns a normalized array.
 */
export const normalizeVendorDocuments = (documents) => {
  if (Array.isArray(documents)) {
    return documents.map(normalizeDocumentEntry).filter(Boolean);
  }
  if (documents && typeof documents === 'object') {
    return normalizeLegacyVendorDocuments(documents);
  }
  return [];
};

const DOCUMENT_BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

/** Resolves a possibly-relative vendor document URL against the API host, for opening in a new tab. */
export const resolveVendorDocumentUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = DOCUMENT_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
};

/** Builds a pending (not-yet-saved) document entry for a freshly selected file. */
export const createVendorDocumentMeta = (file) => ({
  id: null,
  clientId: generateVendorDocumentClientId(),
  documentType: null,
  fileName: file.name,
  fileSize: file.size,
  mimeType: file.type,
  uploadedAt: null,
  downloadUrl: null,
  storageKey: null,
  _file: file,
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

/** Strips client-only fields before sending to the backend. Index order is preserved so it lines
 * up 1:1 with getVendorDocumentFileEntries's indices when building the multipart request. */
export const sanitizeVendorDocumentsForSave = (documents) =>
  normalizeVendorDocuments(documents).map(({ _file, clientId, ...meta }) => meta);

/** Pending (not-yet-uploaded) files, each tagged with its position in the normalized array —
 * used to name the matching `documents[${index}].file` multipart part (see
 * docs/vendor-documents-api-contract.md §3b). Must be derived from the same normalized array,
 * in the same order, as sanitizeVendorDocumentsForSave to keep indices aligned. */
export const getVendorDocumentFileEntries = (documents) =>
  normalizeVendorDocuments(documents)
    .map((entry, index) => ({ index, file: entry._file }))
    .filter(({ file }) => typeof File !== 'undefined' && file instanceof File);

export const countVendorDocuments = (documents) => normalizeVendorDocuments(documents).length;

export const formatVendorDocumentSize = (bytes = 0) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
