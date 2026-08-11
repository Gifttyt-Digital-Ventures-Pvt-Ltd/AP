import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DEFAULT_CURRENCY, formatCurrency, normalizeCurrencyCode } from "../../utils/currency";
import useForeignCurrencyInrConversionSubscription from "../../hooks/useForeignCurrencyInrConversionSubscription";

export const isForeignCurrency = (currency = DEFAULT_CURRENCY) =>
  normalizeCurrencyCode(currency) !== DEFAULT_CURRENCY;

export const shouldShowInrConversion = (currency, enabled) =>
  Boolean(enabled && isForeignCurrency(currency));

export const normalizeConversionStateForCurrency = (state = {}, currency, enabled) => {
  if (!shouldShowInrConversion(currency, enabled)) {
    return {
      ...state,
      convertToInr: false,
      matchingInrValue: null,
    };
  }
  return state;
};

export const getInrConversionValidationError = ({ currency, enabled, convertToInr, matchingInrValue }) => {
  if (!shouldShowInrConversion(currency, enabled) || !convertToInr) return "";
  const value = Number(matchingInrValue);
  if (matchingInrValue === "" || matchingInrValue === null || matchingInrValue === undefined) {
    return "Converted INR Amount is required.";
  }
  if (!Number.isFinite(value) || value <= 0) {
    return "Converted INR Amount must be greater than zero.";
  }
  return "";
};

const InrConversionFields = ({
  currency = DEFAULT_CURRENCY,
  convertToInr = false,
  matchingInrValue = "",
  onChange,
  disabled = false,
  className = "",
}) => {
  const { isForeignCurrencyInrConversionEnabled } = useForeignCurrencyInrConversionSubscription();

  if (!shouldShowInrConversion(currency, isForeignCurrencyInrConversionEnabled)) return null;

  const error = getInrConversionValidationError({
    currency,
    enabled: isForeignCurrencyInrConversionEnabled,
    convertToInr,
    matchingInrValue,
  });

  return (
    <div className={`rounded-md border border-dashed bg-muted/30 p-3 ${className}`}>
      <div className="flex items-start gap-2">
        <Checkbox
          id="convert-to-inr"
          checked={Boolean(convertToInr)}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onChange?.({
              convertToInr: Boolean(checked),
              matchingInrValue: checked ? matchingInrValue : null,
            })
          }
        />
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="convert-to-inr" className="text-sm font-medium">
            Convert to INR
          </Label>
          <p className="text-xs text-muted-foreground">
            Convert this document into INR for Matching and Payment. No exchange-rate calculation will be performed. Enter the INR value manually.
          </p>
        </div>
      </div>
      {convertToInr ? (
        <div className="mt-3 space-y-1">
          <Label htmlFor="matching-inr-value" className="text-xs">
            Converted INR Amount
          </Label>
          <Input
            id="matching-inr-value"
            type="number"
            min="0"
            step="0.01"
            value={matchingInrValue ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange?.({
                convertToInr: true,
                matchingInrValue: event.target.value,
              })
            }
            placeholder="Enter INR value manually"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

export const ConvertedInrAmountSummary = ({
  convertToInr = false,
  matchingInrValue,
  label = "Converted INR Amount",
  className = "",
}) => {
  if (!convertToInr || Number(matchingInrValue) <= 0) return null;

  return (
    <div className={className}>
      <span>{label}</span>
      <span>{formatCurrency(matchingInrValue, DEFAULT_CURRENCY)}</span>
    </div>
  );
};

export default InrConversionFields;
