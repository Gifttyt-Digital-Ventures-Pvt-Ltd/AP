import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  formatBankAccountSummaryLine,
  formatBankAccountType,
  getActiveBankAccounts,
  isBankAccountActive,
  maskBankAccountNumber,
  normalizeBankAccountList,
} from '../../pages/banking/utils/bankAccounts';

const StatusBadge = ({ active }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
      active
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
        : 'bg-muted text-muted-foreground',
    )}
  >
    {active ? 'Active' : 'Inactive'}
  </span>
);

const BankAccountRow = ({
  account,
  highlighted = false,
  compact = false,
}) => {
  const accountName = account.account_name || account.accountName || 'Connected account';
  const bankLine = formatBankAccountSummaryLine(account);
  const accountType = formatBankAccountType(account.account_type || account.accountType);
  const currency = account.currency || 'INR';
  const ifscCode = account.ifsc_code || account.ifscCode || '';
  const active = isBankAccountActive(account);

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        highlighted
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-background/80',
        compact ? 'py-2' : '',
      )}
      data-testid={`connected-bank-account-${account.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className={cn('font-medium truncate', compact ? 'text-sm' : 'text-sm md:text-base')}>
            {accountName}
          </p>
          <p className="text-xs text-muted-foreground">{bankLine}</p>
          {!compact ? (
            <p className="text-[11px] text-muted-foreground">
              {accountType}
              {ifscCode ? ` · IFSC ${ifscCode}` : ''}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{currency}</span>
          <StatusBadge active={active} />
        </div>
      </div>
    </div>
  );
};

const ConnectedBankAccountsPanel = ({
  accounts = [],
  selectedAccountId = null,
  variant = 'banner',
  className,
  loading = false,
  title = 'Connected Banking',
  showManageLink = true,
}) => {
  const normalizedAccounts = normalizeBankAccountList(accounts);
  const activeAccounts = getActiveBankAccounts(normalizedAccounts);
  const selectedAccount = selectedAccountId
    ? normalizedAccounts.find((account) => String(account.id) === String(selectedAccountId))
    : null;
  const highlightedAccounts = selectedAccount
    ? [selectedAccount]
    : activeAccounts.length > 0
      ? activeAccounts
      : normalizedAccounts.slice(0, 1);
  const otherAccounts = normalizedAccounts.filter(
    (account) =>
      !highlightedAccounts.some(
        (highlighted) => String(highlighted.id) === String(account.id),
      ),
  );

  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground',
          className,
        )}
        data-testid="connected-banking-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading connected bank accounts...
      </div>
    );
  }

  if (normalizedAccounts.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-amber-300/70 bg-amber-50/60 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/20',
          className,
        )}
        data-testid="connected-banking-empty"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              No connected bank account
            </p>
            <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
              Connect a bank account in Settings to release payments and process batches.
            </p>
          </div>
          {showManageLink ? (
            <Link
              to="/settings"
              className="text-xs font-medium text-primary hover:underline"
            >
              Manage in Settings
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  const compact = variant === 'compact' || variant === 'preview';

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card shadow-sm',
        compact ? 'p-3' : 'p-4',
        className,
      )}
      data-testid="connected-banking-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">{title}</p>
            {!compact ? (
              <p className="text-xs text-muted-foreground">
                {activeAccounts.length > 0
                  ? `${activeAccounts.length} active account${activeAccounts.length === 1 ? '' : 's'} connected`
                  : 'No active account — activate one in Settings'}
              </p>
            ) : null}
          </div>
        </div>
        {showManageLink ? (
          <div className="flex items-center gap-3 text-xs">
            <Link to="/banking" className="font-medium text-primary hover:underline">
              Open Banking
            </Link>
            <Link to="/settings" className="font-medium text-primary hover:underline">
              Settings
            </Link>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        {highlightedAccounts.map((account) => (
          <BankAccountRow
            key={account.id}
            account={account}
            highlighted
            compact={compact}
          />
        ))}

        {!compact && otherAccounts.length > 0 ? (
          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Other connected accounts
            </p>
            {otherAccounts.map((account) => (
              <BankAccountRow key={account.id} account={account} compact />
            ))}
          </div>
        ) : null}
      </div>

      {!compact && activeAccounts.length === 0 ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
          All connected accounts are inactive. Mark one as active in Settings before processing payments.
        </p>
      ) : null}
    </div>
  );
};

export const SelectedBankAccountPreview = ({ account }) => {
  if (!account) return null;

  const accountName = account.account_name || account.accountName || 'Connected account';
  const ifscCode = account.ifsc_code || account.ifscCode || '';

  return (
    <div
      className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs"
      data-testid="selected-bank-account-preview"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{accountName}</span>
        <StatusBadge active={isBankAccountActive(account)} />
      </div>
      <p className="mt-1 text-muted-foreground">{formatBankAccountSummaryLine(account)}</p>
      {ifscCode ? <p className="mt-0.5 text-muted-foreground">IFSC {ifscCode}</p> : null}
      <p className="mt-0.5 text-muted-foreground">
        Account {maskBankAccountNumber(account.account_number || account.accountNumber, { reveal: false })}
      </p>
    </div>
  );
};

export default ConnectedBankAccountsPanel;
