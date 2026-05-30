import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { ArrowRight } from 'lucide-react';

const TopVendorsCard = ({ vendors = [], formatFullCurrency }) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Top Vendors by Spend</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/vendors')}>
            View All <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {vendors.length > 0 ? (
          <div className="space-y-3">
            {vendors.slice(0, 5).map((vendor, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-semibold text-emerald-700">
                    {idx + 1}
                  </div>
                  <p className="font-medium text-sm">{vendor.name}</p>
                </div>
                <p className="font-semibold text-sm text-emerald-600">
                  {formatFullCurrency(vendor.amount)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">No vendor data available</div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopVendorsCard;
