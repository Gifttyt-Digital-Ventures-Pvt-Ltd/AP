import { useEffect, useMemo, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { formatCredits } from "../../../components/credits/CreditAmount";
import { CREDIT_ACTION_CODES } from "../../../constants/creditActions";
import { useRBAC } from "../../../contexts/RBACContext";
import { useMeteredActionEstimate } from "../../../hooks/useMeteredActionEstimate";

const PO_CREATE_OPTIONS = {
  MANUAL: "MANUAL",
  UPLOAD: "UPLOAD",
};

const UploadOptionCreditNote = () => {
  const { isBillingFeatureEnabled, isTokenBasedSubscription } = useRBAC();
  const estimate = useMeteredActionEstimate(CREDIT_ACTION_CODES.PO_UPLOAD, 1);

  if (
    !isBillingFeatureEnabled ||
    !isTokenBasedSubscription ||
    estimate.loading ||
    !estimate.action
  ) {
    return null;
  }

  if (estimate.isDisabled) {
    return (
      <span className="mt-0.5 block text-xs text-destructive">
        Unavailable for your organisation
      </span>
    );
  }

  if (estimate.isFree) {
    return (
      <span className="mt-0.5 block text-xs text-green-700 dark:text-green-400">
        No tokens required
      </span>
    );
  }

  return (
    <span className="mt-0.5 block text-xs text-muted-foreground">
      ~{formatCredits(estimate.rate)} tokens per scan
    </span>
  );
};

const PoCreateMenu = ({
  open,
  onToggle,
  onSelect,
  disabled = false,
  canUploadPo = false,
}) => {
  const menuRef = useRef(null);
  const createOptions = useMemo(
    () =>
      [
        {
          value: PO_CREATE_OPTIONS.MANUAL,
          label: "Create Manually",
          description: "Enter purchase order details in the PO form.",
        },
        canUploadPo
          ? {
              value: PO_CREATE_OPTIONS.UPLOAD,
              label: "Upload PO",
              description: "Scan an existing PO document and review extracted fields.",
            }
          : null,
      ].filter(Boolean),
    [canUploadPo],
  );
  const hasMultipleOptions = createOptions.length > 1;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      onToggle?.(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onToggle?.(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onToggle]);

  const handlePrimaryClick = () => {
    if (hasMultipleOptions) {
      onToggle?.();
      return;
    }
    onSelect?.(createOptions[0]?.value);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button data-testid="create-po-btn" onClick={handlePrimaryClick} disabled={disabled}>
        <Plus className="mr-2 h-4 w-4" />
        Create PO
      </Button>
      {open && hasMultipleOptions ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-border bg-background p-2 shadow-md">
          {createOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => onSelect(option.value)}
              data-testid={`po-create-option-${option.value}`}
            >
              <span className="font-medium">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              ) : null}
              {option.value === PO_CREATE_OPTIONS.UPLOAD ? (
                <UploadOptionCreditNote />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export { PO_CREATE_OPTIONS };
export default PoCreateMenu;
