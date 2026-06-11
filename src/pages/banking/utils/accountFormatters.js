import { ACCOUNT_LINK_STATUS } from "../constants";

export const getLinkedAccounts = (accounts = []) =>
  accounts.filter((account) => account.status === ACCOUNT_LINK_STATUS.LINKED);

export const formatBankingAccountLabel = (account = {}) => {
  const bank = account.bank || account.bank_name || "Bank";
  const type = account.accountType || account.account_type || "";
  const number = account.accountNumber || account.account_number || "";
  const prefix = [bank, type].filter(Boolean).join(" · ");
  return number ? `${prefix} - ${number}` : prefix;
};
