import { toBankAccountUiPayload } from '../../../Services/utils/payloadMappers';

export const normalizeBankAccount = (account = {}) => toBankAccountUiPayload(account);

export const normalizeBankAccountList = (accounts = []) => {
  if (!Array.isArray(accounts)) {
    if (!accounts || typeof accounts !== 'object') return [];
    return [normalizeBankAccount(accounts)];
  }
  return accounts.map(normalizeBankAccount);
};

export const isBankAccountActive = (account = {}) =>
  account?.is_active !== false && account?.isActive !== false;

export const getActiveBankAccounts = (accounts = []) =>
  normalizeBankAccountList(accounts).filter(isBankAccountActive);

export const getPrimaryBankAccount = (accounts = []) => {
  const normalized = normalizeBankAccountList(accounts);
  const activeAccounts = normalized.filter(isBankAccountActive);
  return activeAccounts[0] ?? normalized[0] ?? null;
};

export const findBankAccountById = (accounts = [], accountId) => {
  if (!accountId) return null;
  const targetId = String(accountId);
  return (
    normalizeBankAccountList(accounts).find(
      (account) => String(account.id) === targetId,
    ) ?? null
  );
};

export const formatBankAccountType = (accountType = '') => {
  const normalized = String(accountType || '').trim();
  if (!normalized) return 'Account';

  const lower = normalized.toLowerCase();
  if (lower === 'checking') return 'Current';
  if (lower === 'savings') return 'Savings';
  if (lower === 'business') return 'Business';

  return normalized;
};

export const maskBankAccountNumber = (accountNumber = '', { reveal = false } = {}) => {
  const value = String(accountNumber || '').trim();
  if (!value) return '-';
  if (reveal) return value;
  if (value.length <= 4) return value;
  return `****${value.slice(-4)}`;
};

export const formatBankAccountOptionLabel = (account = {}) => {
  const bankName = account.bank_name || account.bankName || 'Bank';
  const accountType = formatBankAccountType(account.account_type || account.accountType);
  const maskedNumber = maskBankAccountNumber(account.account_number || account.accountNumber);
  const statusLabel = isBankAccountActive(account) ? '' : ' · Inactive';
  return `${bankName} · ${accountType} · ${maskedNumber}${statusLabel}`;
};

export const formatBankAccountSummaryLine = (account = {}) => {
  const bankName = account.bank_name || account.bankName || 'Bank';
  const accountType = formatBankAccountType(account.account_type || account.accountType);
  const maskedNumber = maskBankAccountNumber(account.account_number || account.accountNumber);
  return `${bankName} · ${accountType} · ${maskedNumber}`;
};

export const findBankAccountForBatch = (accounts = [], batch = {}) => {
  const normalizedAccounts = normalizeBankAccountList(accounts);
  const batchAccountId =
    batch.bankAccountId ??
    batch.bank_account_id ??
    batch.sourceBankAccountId ??
    batch.source_bank_account_id;

  if (batchAccountId) {
    const byId = findBankAccountById(normalizedAccounts, batchAccountId);
    if (byId) return byId;
  }

  const batchAccountName = String(
    batch.bankAccountName ?? batch.bank_account_name ?? '',
  )
    .trim()
    .toLowerCase();

  if (!batchAccountName) return null;

  return (
    normalizedAccounts.find((account) => {
      const candidates = [
        account.account_name,
        account.accountName,
        account.bank_name,
        account.bankName,
      ]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());

      return candidates.some(
        (candidate) =>
          candidate === batchAccountName ||
          batchAccountName.includes(candidate) ||
          candidate.includes(batchAccountName),
      );
    }) ?? null
  );
};

export const getDefaultBankAccountId = (accounts = []) => {
  const primary = getPrimaryBankAccount(accounts);
  return primary?.id ? String(primary.id) : '';
};
