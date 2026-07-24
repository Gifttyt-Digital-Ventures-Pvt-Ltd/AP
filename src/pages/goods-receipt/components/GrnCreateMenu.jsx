import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatCredits } from '../../../components/credits/CreditAmount';
import { CREDIT_ACTION_CODES } from '../../../constants/creditActions';
import { useRBAC } from '../../../contexts/RBACContext';
import { useMeteredActionEstimate } from '../../../hooks/useMeteredActionEstimate';
import { GRN_CREATE_OPTIONS, GRN_SOURCE } from '../constants';

const UploadOptionCreditNote = () => {
  const { isBillingFeatureEnabled, isTokenBasedSubscription } = useRBAC();
  const estimate = useMeteredActionEstimate(CREDIT_ACTION_CODES.GRN_UPLOAD, 1);

  if (!isBillingFeatureEnabled || !isTokenBasedSubscription || estimate.loading || !estimate.action) {
    return null;
  }

  if (estimate.isDisabled) {
    return <span className="mt-0.5 block text-xs text-destructive">Unavailable for your organisation</span>;
  }

  if (estimate.isFree) {
    return <span className="mt-0.5 block text-xs text-green-700 dark:text-green-400">No tokens required</span>;
  }

  return (
    <span className="mt-0.5 block text-xs text-muted-foreground">
      ~{formatCredits(estimate.rate)} tokens per scan
    </span>
  );
};

const GrnCreateMenu = ({
  open,
  onToggle,
  onSelect,
  disabled = false,
  isPiEnabled = false,
}) => {
  const createOptions = useMemo(
    () =>
      GRN_CREATE_OPTIONS.filter((option) => {
        if (option.value === GRN_SOURCE.FROM_PI) return isPiEnabled;
        return true;
      }),
    [isPiEnabled],
  );

  return (
    <div className="relative">
      <Button
        data-testid="create-grn-btn"
        onClick={onToggle}
        disabled={disabled}
      >
        <Plus className="mr-2 h-4 w-4" />
        Create GRN
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-border bg-background p-2 shadow-md">
          {createOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => onSelect(option.value)}
              data-testid={`grn-create-option-${option.value}`}
            >
              <span className="font-medium">{option.label}</span>
              {option.description && (
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.description}
                </span>
              )}
              {option.value === GRN_SOURCE.UPLOAD ? <UploadOptionCreditNote /> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrnCreateMenu;
