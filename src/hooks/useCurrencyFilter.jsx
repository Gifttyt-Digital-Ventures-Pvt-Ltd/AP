import { useMemo, useState } from "react";
import { useGetAvailableCurrenciesQuery } from "../Services/apis/corporateApi";
import {
  CURRENCY_FILTER_ALL,
  DEFAULT_CURRENCY,
  FALLBACK_CURRENCIES,
  normalizeCurrencyCode,
  toCurrencyApiParam,
} from "../utils/currency";

export const useCurrencyFilter = (
  screen,
  { defaultCurrency = DEFAULT_CURRENCY, excludeAll = false } = {},
) => {
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const { data: availableCurrencies = [], isLoading, isError } =
    useGetAvailableCurrenciesQuery(screen, { skip: !screen });

  const currencies = useMemo(() => {
    let list =
      Array.isArray(availableCurrencies) && availableCurrencies.length > 0
        ? availableCurrencies.map(normalizeCurrencyCode)
        : [...FALLBACK_CURRENCIES];

    if (excludeAll) {
      list = list.filter(
        (currency) => normalizeCurrencyCode(currency) !== CURRENCY_FILTER_ALL,
      );
    }

    return list;
  }, [availableCurrencies, excludeAll]);

  const effectiveSelectedCurrency = useMemo(() => {
    const normalized = normalizeCurrencyCode(selectedCurrency);
    if (excludeAll && normalized === CURRENCY_FILTER_ALL) {
      return defaultCurrency;
    }
    if (!currencies.includes(normalized) && currencies.length > 0) {
      return currencies.includes(defaultCurrency) ? defaultCurrency : currencies[0];
    }
    return selectedCurrency;
  }, [selectedCurrency, excludeAll, defaultCurrency, currencies]);

  const currencyParam = useMemo(
    () => toCurrencyApiParam(effectiveSelectedCurrency),
    [effectiveSelectedCurrency],
  );

  const queryArgs = useMemo(() => {
    const args = {};
    if (currencyParam) args.currency = currencyParam;
    return args;
  }, [currencyParam]);

  const isAllSelected =
    normalizeCurrencyCode(effectiveSelectedCurrency) === CURRENCY_FILTER_ALL;

  return {
    currencies,
    selectedCurrency: effectiveSelectedCurrency,
    setSelectedCurrency,
    currencyParam,
    queryArgs,
    isAllSelected,
    currenciesLoading: isLoading,
    currenciesError: isError,
  };
};
