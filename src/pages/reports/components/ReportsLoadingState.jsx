import React from 'react';
import { Loader2 } from 'lucide-react';

const ReportsLoadingState = () => (
  <div className="min-h-[60vh] rounded-xl border border-border bg-card/50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="mt-3 text-sm text-muted-foreground">Loading reports...</p>
    </div>
  </div>
);

export default ReportsLoadingState;
