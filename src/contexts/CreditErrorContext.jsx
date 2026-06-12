import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toast } from "sonner";

import InsufficientCreditsModal from "../components/credits/InsufficientCreditsModal";
import { parseCreditError } from "../utils/creditErrors";

const CreditErrorContext = createContext(null);

export const CreditErrorProvider = ({ children }) => {
  const [insufficientCredits, setInsufficientCredits] = useState({
    open: false,
    required: 0,
    available: 0,
  });

  const handleCreditError = useCallback((error) => {
    const parsed = parseCreditError(error);
    if (!parsed) return false;

    if (parsed.type === "INSUFFICIENT_CREDITS") {
      setInsufficientCredits({
        open: true,
        required: parsed.required,
        available: parsed.available,
      });
      return true;
    }

    if (parsed.type === "ACTION_DISABLED") {
      toast.error(parsed.message);
      return true;
    }

    if (parsed.type === "ACTION_INACTIVE") {
      toast.error(parsed.message);
      return true;
    }

    return false;
  }, []);

  const value = useMemo(() => ({ handleCreditError }), [handleCreditError]);

  return (
    <CreditErrorContext.Provider value={value}>
      {children}
      <InsufficientCreditsModal
        open={insufficientCredits.open}
        onOpenChange={(open) =>
          setInsufficientCredits((current) => ({ ...current, open }))
        }
        required={insufficientCredits.required}
        available={insufficientCredits.available}
      />
    </CreditErrorContext.Provider>
  );
};

export const useCreditErrorHandler = () => {
  const context = useContext(CreditErrorContext);
  if (!context) {
    throw new Error("useCreditErrorHandler must be used within CreditErrorProvider");
  }
  return context;
};
