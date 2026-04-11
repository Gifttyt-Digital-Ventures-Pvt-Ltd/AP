import React from 'react';
import { Button } from '../../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Input } from '../../../components/ui/input';
import { Calendar, RefreshCw } from 'lucide-react';

// Top controls for date window selection and data refresh.
const ReportsHeader = ({ dateRange, setDateRange, customDays, setCustomDays, fetchAllData, loading }) => (
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      <p className="text-muted-foreground">Comprehensive insights into your accounts payable</p>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[140px]" data-testid="date-range-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {dateRange === 'custom' && (
          <Input
            type="number"
            placeholder="Days"
            className="w-20"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            data-testid="custom-days-input"
          />
        )}
      </div>
      <Button variant="outline" onClick={fetchAllData} disabled={loading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
    </div>
  </div>
);

export default ReportsHeader;
