import { useMemo, useState } from "react";
import { useGetAvailableCurrenciesQuery } from "../Services/apis/corporateApi";
import {
  CURRENCY_FILTER_ALL,
  DEFAULT_CURRENCY,
  FALLBACK_CURRENCIES,
  normalizeCurrencyCode,
  toCurrencyApiParam,
} from "../utils/currency";

export const useCurrencyFilter = (screen, { defaultCurrency = DEFAULT_CURRENCY } = {}) => {
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  const { data: availableCurrencies = [], isLoading, isError } =
    useGetAvailableCurrenciesQuery(screen, { skip: !screen });

  const currencies = useMemo(() => {
    if (Array.isArray(availableCurrencies) && availableCurrencies.length > 0) {
      return availableCurrencies.map(normalizeCurrencyCode);
    }
    return FALLBACK_CURRENCIES;
  }, [availableCurrencies]);

  const currencyParam = useMemo(
    () => toCurrencyApiParam(selectedCurrency),
    [selectedCurrency],
  );

  const queryArgs = useMemo(() => {
    const args = {};
    if (currencyParam) args.currency = currencyParam;
    return args;
  }, [currencyParam]);

  const isAllSelected =
    normalizeCurrencyCode(selectedCurrency) === CURRENCY_FILTER_ALL;

  return {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    currencyParam,
    queryArgs,
    isAllSelected,
    currenciesLoading: isLoading,
    currenciesError: isError,
  };
};
