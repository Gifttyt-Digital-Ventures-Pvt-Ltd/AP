/**
 * Shared "does this field match what OCR extracted from the document"
 * comparator — single source of truth for both the checklist (which just
 * needs a done/not-done + hint) and the Invoice Flags engine's per-field
 * mismatch flags (flagRules/extractionMismatch.js), so the two can never
 * disagree about which fields diverged from the scan.
 *
 * Strict trim+string equality only for now, matching the checklist's
 * pre-existing behavior. Type-aware comparison (fuzzy names, date-format
 * normalization, amount normalization) is a later addition — see the
 * comparator registry design in docs/invoice-flags-api-contract.md.
 */
export const EXTRACTED_MISMATCH_HINT = "differs from scanned invoice";

export const matchesExtracted = (extractedSnapshot, field, currentValue) => {
  if (!extractedSnapshot) return true;
  const extractedValue = String(extractedSnapshot[field] ?? "").trim();
  if (!extractedValue) return true;
  return String(currentValue ?? "").trim() === extractedValue;
};

/**
 * Loose comparator for names/addresses — MD §5.7: "Names and addresses are
 * compared loosely, so ordinary rewording passes," with the worked example
 * `Kailash , Mumbai` vs `Kailash, Mumbai` being "same address." Deliberately
 * narrow: only case, whitespace/line-breaks, and comma/period/semicolon
 * punctuation are neutralized — no word reordering, abbreviation expansion,
 * or edit-distance/fuzzy scoring, so a genuine change in any real word or
 * number is never masked.
 */
const normalizeForLooseCompare = (value) =>
  String(value ?? "")
    .replace(/[,.;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const matchesExtractedLoosely = (extractedSnapshot, field, currentValue) => {
  if (!extractedSnapshot) return true;
  const extractedValue = normalizeForLooseCompare(extractedSnapshot[field]);
  if (!extractedValue) return true;
  return normalizeForLooseCompare(currentValue) === extractedValue;
};

/**
 * §5.7 "When the AI wasn't sure": correcting a field the AI wasn't confident
 * about must never raise a flag. Unknown confidence (no real signal exists
 * yet — see docs/invoice-flags-api-contract.md) is NOT treated as low —
 * flags fire as before until a real per-field confidence source lands, at
 * which point only fields it actually scores start being gated.
 */
export const isLowConfidenceOverride = (extractedSnapshot, field, threshold) => {
  const confidence = extractedSnapshot?.fieldConfidence?.[field];
  if (typeof confidence !== "number" || !Number.isFinite(confidence)) return false;
  if (typeof threshold !== "number" || !Number.isFinite(threshold)) return false;
  return confidence < threshold;
};
