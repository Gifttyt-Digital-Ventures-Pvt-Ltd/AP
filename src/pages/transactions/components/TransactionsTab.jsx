import React from "react";
import { Search } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { TabsContent } from "../../../components/ui/tabs";

const TransactionsTab = ({
  value,
  searchTerm,
  setSearchTerm,
  filtersNode = null,
  controlsNode = null,
  children,
}) => {
  return (
    <TabsContent value={value} className="space-y-4">
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 max-w-xs text-sm"
            />
          </div>
          {filtersNode}
          {controlsNode}
        </div>
        {children}
      </div>
    </TabsContent>
  );
};

export default TransactionsTab;
