import React, { useMemo } from 'react';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  findBankAccountById,
  formatBankAccountOptionLabel,
  normalizeBankAccountList,
} from '../../pages/banking/utils/bankAccounts';
import { SelectedBankAccountPreview } from './ConnectedBankAccountsPanel';

const BankAccountSelectField = ({
  id = 'bank_account_id',
  label = 'Bank Account *',
  value = '',
  onChange,
  accounts = [],
  activeOnly = false,
  showPreview = true,
  testId = 'bank-account-select',
  placeholder = 'Select bank account',
}) => {
  const normalizedAccounts = useMemo(
    () => normalizeBankAccountList(accounts),
    [accounts],
  );
  const selectableAccounts = useMemo(() => {
    if (!activeOnly) return normalizedAccounts;
    return normalizedAccounts.filter(
      (account) => account.is_active !== false && account.isActive !== false,
    );
  }, [activeOnly, normalizedAccounts]);
  const selectedAccount = findBankAccountById(selectableAccounts, value)
    ?? findBankAccountById(normalizedAccounts, value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger id={id} data-testid={testId}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {selectableAccounts.map((account) => (
            <SelectItem key={account.id} value={String(account.id)}>
              {formatBankAccountOptionLabel(account)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showPreview && selectedAccount ? (
        <SelectedBankAccountPreview account={selectedAccount} />
      ) : null}
    </div>
  );
};

export default BankAccountSelectField;
