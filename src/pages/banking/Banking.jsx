import React, { useEffect, useState } from 'react';
import { useGetBankAccountsQuery } from '../../Services/apis/approvalsPaymentsBankingApi';
import { useGetTransactionsQuery } from '../../Services/apis/transactionsApi';
import { toast } from 'sonner';
import BankingHeader from './components/BankingHeader';
import AvailableBalanceCard from './components/AvailableBalanceCard';
import TransactionsFilters from './components/TransactionsFilters';
import TransactionsTable from './components/TransactionsTable';

const Banking = () => {
  const { data: bankAccounts = [], isError: bankAccountsError } = useGetBankAccountsQuery();
  const { data: transactionsData = [], isError: transactionsError } = useGetTransactionsQuery({});

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [showAvailableBalance, setShowAvailableBalance] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (bankAccountsError) {
      toast.error('Failed to load bank accounts');
    }
  }, [bankAccountsError]);

  useEffect(() => {
    if (transactionsError) {
      toast.error('Failed to load transactions');
    }
  }, [transactionsError]);

  useEffect(() => {
    if (!selectedAccount && Array.isArray(bankAccounts) && bankAccounts.length > 0) {
      setSelectedAccount(bankAccounts[0]);
    }
  }, [bankAccounts, selectedAccount]);

  const transactions = Array.isArray(transactionsData) ? transactionsData : [];
  const selectedAccountTransactions = transactions
    .filter((txn) => {
      if (!selectedAccount) return true;
      const accountName = (selectedAccount.account_name || '').toLowerCase();
      const bankName = (selectedAccount.bank_name || '').toLowerCase();
      const txnAccount = (txn.account || '').toLowerCase();
      return !txnAccount || txnAccount === accountName || txnAccount === bankName;
    })
    .map((txn) => ({
      id: txn.id,
      vendor: txn.vendor_name || txn.counterparty || txn.description || '-',
      ref_number: String(txn.reference_number || txn.ref_number || txn.id || '-'),
      date: txn.date ? new Date(txn.date) : new Date(),
      withdrawal: txn.is_credit ? null : Number(txn.amount || 0),
      deposit: txn.is_credit ? Number(txn.amount || 0) : null,
      closing_balance: Number(txn.running_balance ?? txn.closing_balance ?? 0),
      authorized_by: txn.reviewed_by_name || txn.authorized_by || null,
      type: txn.is_credit ? 'deposit' : 'withdrawal',
    }))
    .sort((a, b) => b.date - a.date);

  const handleShareAccount = () => {
    if (!selectedAccount) return;

    const accountDetails = `
Account Name: ${selectedAccount.account_name}
Bank: ${selectedAccount.bank_name}
Account Number: ${selectedAccount.account_number}
Account Type: ${selectedAccount.account_type}
Currency: ${selectedAccount.currency}
    `.trim();

    navigator.clipboard.writeText(accountDetails);
    toast.success('Account details copied to clipboard!');
  };

  const handleViewDetails = () => {
    if (!selectedAccount) return;

    toast.info(`
      Account: ${selectedAccount.account_name}
      Bank: ${selectedAccount.bank_name}
      Type: ${selectedAccount.account_type}
      Currency: ${selectedAccount.currency}
    `);
  };

  const filteredTransactions = selectedAccountTransactions.filter((transaction) => {
    const matchesSearch =
      transaction.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.ref_number.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const txnDate = new Date(transaction.date);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    if (fromDate && txnDate < fromDate) return false;
    if (toDate) {
      const toDateEnd = new Date(toDate);
      toDateEnd.setHours(23, 59, 59, 999);
      if (txnDate > toDateEnd) return false;
    }
    return true;
  });

  const availableBalance = selectedAccountTransactions[0]?.closing_balance ?? 0;

  return (
    <div data-testid="banking-page" className="h-full">
      <BankingHeader
        selectedAccount={selectedAccount}
        showFullAccount={showFullAccount}
        setShowFullAccount={setShowFullAccount}
        handleShareAccount={handleShareAccount}
        handleViewDetails={handleViewDetails}
      />

      <AvailableBalanceCard
        showAvailableBalance={showAvailableBalance}
        setShowAvailableBalance={setShowAvailableBalance}
        availableBalance={availableBalance}
      />

      {/* Transactions section composed from filter + table components. */}
      <div>
        <TransactionsFilters
          showDateFilter={showDateFilter}
          setShowDateFilter={setShowDateFilter}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <TransactionsTable filteredTransactions={filteredTransactions} />
      </div>
    </div>
  );
};

export default Banking;
