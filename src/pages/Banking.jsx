import React, { useEffect, useState } from 'react';
import { useGetBankAccountsQuery } from '../Services/apiSlice';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, ChevronDown, Eye, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const Banking = () => {
  const { data: bankAccounts = [], isError: bankAccountsError } = useGetBankAccountsQuery();
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [showFullAccount, setShowFullAccount] = useState(false);

  useEffect(() => {
    generateMockTransactions();
  }, []);

  useEffect(() => {
    if (bankAccountsError) {
      toast.error('Failed to load bank accounts');
    }
  }, [bankAccountsError]);

  useEffect(() => {
    if (!selectedAccount && Array.isArray(bankAccounts) && bankAccounts.length > 0) {
      setSelectedAccount(bankAccounts[0]);
    }
  }, [bankAccounts, selectedAccount]);

  const generateMockTransactions = () => {
    // Mock transaction data for demonstration
    const mockData = [
      {
        id: 1,
        vendor: 'Netlify',
        ref_number: '02/24-25',
        date: new Date('2024-06-02'),
        withdrawal: 90720,
        deposit: null,
        closing_balance: 2020245.04,
        authorized_by: 'Vinay Agrawal',
        type: 'withdrawal'
      },
      {
        id: 2,
        vendor: '********792-001',
        ref_number: 'ICICI N2415102865',
        date: new Date('2024-06-01'),
        withdrawal: null,
        deposit: 110000,
        closing_balance: 1109365.04,
        authorized_by: null,
        type: 'deposit'
      },
      {
        id: 3,
        vendor: 'Disha CD',
        ref_number: '#001001',
        date: new Date('2024-05-12'),
        withdrawal: 4000,
        deposit: null,
        closing_balance: 965.04,
        authorized_by: 'Vinay Agrawal',
        type: 'withdrawal'
      },
      {
        id: 4,
        vendor: 'Netlify',
        ref_number: '01/24-25',
        date: new Date('2024-05-02'),
        withdrawal: 99120,
        deposit: null,
        closing_balance: 4985.04,
        authorized_by: 'Vinay Agrawal',
        type: 'withdrawal'
      },
      {
        id: 5,
        vendor: '********92-001',
        ref_number: 'ICICI N2412397495',
        date: new Date('2024-05-02'),
        withdrawal: null,
        deposit: 100000,
        closing_balance: 1041985.04,
        authorized_by: null,
        type: 'deposit'
      }
    ];
    setTransactions(mockData);
  };

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

  const filteredTransactions = transactions.filter(transaction =>
    transaction.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.ref_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const availableBalance = selectedAccount ? 7842138.00 : 0;

  return (
    <div data-testid="banking-page" className="h-full">
      <div className="mb-6">
        <button className="text-sm text-muted-foreground hover:text-primary mb-4 flex items-center gap-2">
          {"<-"} OptiFii Accounts
        </button>
        
        {selectedAccount && (
          <div>
            <h1 className="text-4xl font-bold font-['Manrope'] text-primary mb-4" data-testid="bank-account-name">
              {selectedAccount.account_name}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-['JetBrains_Mono'] bg-secondary/50 px-3 py-1 rounded border border-border">
                {showFullAccount ? selectedAccount.account_number : `D*************${selectedAccount.account_number.slice(-4)}`}
              </span>
              <button 
                onClick={() => setShowFullAccount(!showFullAccount)}
                className="flex items-center gap-1 text-accent hover:text-accent/80 font-medium"
                data-testid="toggle-account-number"
              >
                <Eye className="h-4 w-4" />
                {showFullAccount ? 'Hide' : 'Show'} Full Account Number
              </button>
              <button 
                onClick={handleShareAccount}
                className="flex items-center gap-1 text-accent hover:text-accent/80 font-medium"
                data-testid="share-account-button"
              >
                <Share2 className="h-4 w-4" />
                Share Account Details
              </button>
              <button 
                onClick={handleViewDetails}
                className="text-accent hover:text-accent/80 font-medium hover:underline"
                data-testid="view-details-button"
              >
                View Account Details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Available Balance Card */}
      <div className="bg-secondary/30 rounded-lg p-6 mb-8 border border-border">
        <p className="text-sm text-muted-foreground mb-2">Available Balance</p>
        <p className="text-5xl font-bold font-['JetBrains_Mono'] text-primary">
          ₹{availableBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Recent Transactions Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold font-['Manrope']">Recent Transactions</h2>
          <Button variant="outline" size="sm">
            Select a Date
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Transactions By invoice, ref.no and vendor"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="transaction-search-input"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full" data-testid="transactions-table">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="p-4 text-left text-sm font-medium">Vendor/Payer</th>
                <th className="p-4 text-left text-sm font-medium">Date</th>
                <th className="p-4 text-left text-sm font-medium">Ref. No.</th>
                <th className="p-4 text-right text-sm font-medium">
                  <span className="flex items-center justify-end gap-1">
                    Withdrawals(Dr)
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </th>
                <th className="p-4 text-right text-sm font-medium">
                  <span className="flex items-center justify-end gap-1">
                    Deposits(Cr)
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </th>
                <th className="p-4 text-right text-sm font-medium">
                  <span className="flex items-center justify-end gap-1">
                    Closing Balance
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </th>
                <th className="p-4 text-left text-sm font-medium">Authorized By</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                  data-testid={`transaction-row-${transaction.id}`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        transaction.type === 'deposit' ? 'bg-emerald-500' : 'bg-primary'
                      }`}>
                        {transaction.type === 'deposit' ? (
                          <div className="flex flex-col items-center">
                            <span className="text-lg">+</span>
                            <span className="text-xs">IN</span>
                          </div>
                        ) : (
                          transaction.vendor.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.vendor}</p>
                        <p className="text-xs text-muted-foreground">{transaction.ref_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div>
                      <p>{format(transaction.date, 'd MMM yyyy')}</p>
                      <p className="text-xs text-muted-foreground">{format(transaction.date, 'h:mm a')}</p>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-['JetBrains_Mono']">
                    {transaction.ref_number}
                  </td>
                  <td className="p-4 text-right font-['JetBrains_Mono'] font-semibold">
                    {transaction.withdrawal ? `₹${transaction.withdrawal.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="p-4 text-right font-['JetBrains_Mono'] font-semibold text-emerald-600">
                    {transaction.deposit ? `+ ₹${transaction.deposit.toLocaleString('en-IN')}` : '-'}
                  </td>
                  <td className="p-4 text-right font-['JetBrains_Mono'] font-semibold">
                    ₹{transaction.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4">
                    {transaction.authorized_by ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                          {transaction.authorized_by.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="text-sm">
                          <p className="font-medium">{transaction.authorized_by}</p>
                          <p className="text-xs text-muted-foreground">vinay@optifii.com</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-transactions">
              No transactions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

