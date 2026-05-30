import React from 'react';
import { Loader2 } from 'lucide-react';

const DashboardLoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default DashboardLoadingState;
