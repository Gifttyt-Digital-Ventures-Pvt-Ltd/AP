import { useCallback, useMemo, useState } from "react";
import {
  getPayableSelectionKey,
  isPayableSelectable,
} from "../utils/payableRows";

const toMoney = (value) => Number(value || 0);

const getCurrency = (row = {}) => row.currency || row.currencyCode || row.currency_code || "INR";

const getNetPayableAmount = (row = {}) =>
  toMoney(row.netPayableAmount ?? row.net_payable_amount ?? row.amount);

const getGrossAmount = (row = {}) =>
  toMoney(row.grossAmount ?? row.gross_amount ?? row.originalAmount ?? row.totalAmount ?? row.amount);

const getTdsAmount = (row = {}) => toMoney(row.tdsAmount ?? row.tds_amount);

export const usePayablesSelection = (rows = []) => {
  const [selectedKeys, setSelectedKeys] = useState([]);

  const rowByKey = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      const key = getPayableSelectionKey(row);
      if (key) map.set(key, row);
    });
    return map;
  }, [rows]);

  const selectedRows = useMemo(
    () => selectedKeys.map((key) => rowByKey.get(key)).filter(Boolean),
    [rowByKey, selectedKeys],
  );

  const selectableRows = useMemo(
    () => rows.filter((row) => isPayableSelectable(row) && getPayableSelectionKey(row)),
    [rows],
  );

  const validateCurrency = useCallback((nextRows) => {
    const currencies = [...new Set(nextRows.map(getCurrency).filter(Boolean))];
    if (currencies.length > 1) {
      return "Payable rows with different currencies cannot be selected together.";
    }
    return "";
  }, []);

  const toggle = useCallback((key) => {
    const row = rowByKey.get(key);
    if (!row) return { ok: false, error: "Payable row is not available." };
    if (!isPayableSelectable(row)) {
      return {
        ok: false,
        error: row.disabledReason || "This payable row is not available for payment.",
      };
    }

    const isSelected = selectedKeys.includes(key);
    const nextKeys = isSelected
      ? selectedKeys.filter((selectedKey) => selectedKey !== key)
      : [...selectedKeys, key];
    const nextRows = nextKeys.map((selectedKey) => rowByKey.get(selectedKey)).filter(Boolean);
    const currencyError = validateCurrency(nextRows);
    if (currencyError) return { ok: false, error: currencyError };

    setSelectedKeys(nextKeys);
    return { ok: true };
  }, [rowByKey, selectedKeys, validateCurrency]);

  const selectAll = useCallback((visibleRows = selectableRows) => {
    const visibleSelectableRows = visibleRows.filter((row) => isPayableSelectable(row));
    const visibleKeys = visibleSelectableRows.map(getPayableSelectionKey).filter(Boolean);
    const allVisibleSelected =
      visibleKeys.length > 0 && visibleKeys.every((key) => selectedKeys.includes(key));
    const nextKeys = allVisibleSelected
      ? selectedKeys.filter((key) => !visibleKeys.includes(key))
      : Array.from(new Set([...selectedKeys, ...visibleKeys]));
    const nextRows = nextKeys.map((key) => rowByKey.get(key)).filter(Boolean);
    const currencyError = validateCurrency(nextRows);
    if (currencyError) return { ok: false, error: currencyError };

    setSelectedKeys(nextKeys);
    return { ok: true };
  }, [rowByKey, selectableRows, selectedKeys, validateCurrency]);

  const clear = useCallback(() => setSelectedKeys([]), []);

  const totals = useMemo(() => {
    const currency = selectedRows[0] ? getCurrency(selectedRows[0]) : "INR";
    return selectedRows.reduce(
      (acc, row) => ({
        count: acc.count + 1,
        grossTotal: acc.grossTotal + getGrossAmount(row),
        tdsTotal: acc.tdsTotal + getTdsAmount(row),
        netPayableTotal: acc.netPayableTotal + getNetPayableAmount(row),
        currency,
      }),
      { count: 0, grossTotal: 0, tdsTotal: 0, netPayableTotal: 0, currency },
    );
  }, [selectedRows]);

  return {
    selectedKeys,
    selectedRows,
    selectableRows,
    totals,
    canSubmit: selectedRows.length > 0,
    setSelectedKeys,
    toggle,
    selectAll,
    clear,
  };
};

export default usePayablesSelection;

