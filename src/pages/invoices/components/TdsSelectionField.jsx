import React, { useEffect, useMemo, useState } from "react";
import AppSelect from "../../../components/common/AppSelect";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useGetTdsSectionsQuery } from "../../../Services/apis/taxApi";
import {
  buildCustomTdsValue,
  buildTdsOptions,
  CUSTOM_TDS_VALUE,
  extractCustomTdsRate,
  isCustomTdsSelection,
  isValidCustomTdsRate,
  NO_TDS_VALUE,
  parseTdsSelection,
  sanitizeCustomTdsRateInput,
} from "../utils/tds";

const getCustomRateDraftFromValue = (value = "") => {
  if (!isCustomTdsSelection(value) || value === CUSTOM_TDS_VALUE) {
    return "";
  }
  return extractCustomTdsRate(value);
};

const TdsSelectionField = ({
  value = "",
  onChange,
  disabled = false,
  label = "TDS",
  showLabel = true,
  selectClassName = "h-9 w-full",
  inputClassName = "h-9 w-24",
  testIdPrefix = "tds-selection",
}) => {
  const { data: tdsSectionsData = [] } = useGetTdsSectionsQuery();
  const [customMode, setCustomMode] = useState(() => isCustomTdsSelection(value));
  const [customRateDraft, setCustomRateDraft] = useState(() =>
    getCustomRateDraftFromValue(value),
  );
  const [customRateError, setCustomRateError] = useState("");

  useEffect(() => {
    if (isCustomTdsSelection(value)) {
      setCustomMode(true);
      if (value !== CUSTOM_TDS_VALUE) {
        setCustomRateDraft(getCustomRateDraftFromValue(value));
      }
      return;
    }

    if (value && value !== NO_TDS_VALUE) {
      setCustomMode(false);
      setCustomRateDraft("");
      setCustomRateError("");
    }
  }, [value]);

  const tdsOptions = useMemo(() => {
    const standardOptions = buildTdsOptions(tdsSectionsData, value);
    const noTds = standardOptions.find((option) => option.value === NO_TDS_VALUE);
    const restStandard = standardOptions.filter((option) => option.value !== NO_TDS_VALUE);

    return [
      noTds,
      { value: CUSTOM_TDS_VALUE, label: "Custom %" },
      ...restStandard,
    ].filter(Boolean);
  }, [tdsSectionsData, value]);

  const showCustomTdsInput = customMode || isCustomTdsSelection(value);
  const selectValue = showCustomTdsInput ? CUSTOM_TDS_VALUE : value || NO_TDS_VALUE;

  const emitChange = (nextValue) => {
    if (!nextValue || nextValue === NO_TDS_VALUE) {
      setCustomMode(false);
      setCustomRateDraft("");
      setCustomRateError("");
      onChange?.({
        tds: "",
        tdsSectionId: null,
        tdsSectionCode: null,
        tdsRate: null,
      });
      return;
    }

    if (nextValue === CUSTOM_TDS_VALUE) {
      setCustomMode(true);
      setCustomRateDraft("");
      setCustomRateError("");
      onChange?.({
        tds: CUSTOM_TDS_VALUE,
        tdsSectionId: null,
        tdsSectionCode: null,
        tdsRate: null,
      });
      return;
    }

    setCustomMode(isCustomTdsSelection(nextValue));
    setCustomRateError("");
    onChange?.({
      tds: nextValue,
      ...parseTdsSelection(nextValue),
    });
  };

  const emitCustomRateChange = (nextRateText) => {
    const sanitized = sanitizeCustomTdsRateInput(nextRateText);
    setCustomRateDraft(sanitized.text);

    if (!sanitized.text) {
      setCustomRateError("");
      emitChange(CUSTOM_TDS_VALUE);
      return;
    }

    if (!sanitized.isComplete) {
      setCustomRateError("");
      onChange?.({
        tds: CUSTOM_TDS_VALUE,
        tdsSectionId: null,
        tdsSectionCode: null,
        tdsRate: null,
      });
      return;
    }

    if (!isValidCustomTdsRate(sanitized.numeric)) {
      setCustomRateError("Enter a rate between 0 and 100");
      return;
    }

    setCustomRateError("");
    const nextTdsValue = buildCustomTdsValue(sanitized.numeric);
    onChange?.({
      tds: nextTdsValue,
      ...parseTdsSelection(nextTdsValue),
    });
  };

  return (
    <div className="space-y-2">
      {showLabel ? <Label className="text-sm font-medium">{label}</Label> : null}
      <div className="flex flex-wrap items-center gap-2">
        <AppSelect
          value={selectValue}
          onChange={(event) => emitChange(event.target.value)}
          placeholder="Select TDS"
          options={tdsOptions}
          disabled={disabled}
          className={selectClassName}
          data-testid={`${testIdPrefix}-select`}
        />
        {showCustomTdsInput ? (
          <div className="space-y-1">
            <Input
              type="text"
              inputMode="decimal"
              value={customRateDraft}
              onChange={(event) => emitCustomRateChange(event.target.value)}
              placeholder="0.00"
              className={inputClassName}
              disabled={disabled}
              aria-invalid={Boolean(customRateError)}
              data-testid={`${testIdPrefix}-custom-rate`}
            />
            {customRateError ? (
              <p className="text-[11px] text-destructive">{customRateError}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default TdsSelectionField;
