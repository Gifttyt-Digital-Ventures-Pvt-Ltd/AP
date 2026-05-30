import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';
import { AlertTriangle } from 'lucide-react';

const ApprovalBottleneckCard = ({ bottleneckAnalysis = [], avgProcessingDays = 0 }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        Approval Bottleneck
      </CardTitle>
    </CardHeader>
    <CardContent>
      {bottleneckAnalysis.length > 0 ? (
        <div className="space-y-4">
          {bottleneckAnalysis.map((stage, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span>{stage.stage}</span>
                <span
                  className={`font-semibold ${
                    stage.count > 5
                      ? 'text-red-600'
                      : stage.count > 2
                        ? 'text-yellow-600'
                        : 'text-green-600'
                  }`}
                >
                  {stage.count} invoices
                </span>
              </div>
              <Progress
                value={Math.min((stage.count / 10) * 100, 100)}
                className={`h-2 ${
                  stage.count > 5
                    ? '[&>div]:bg-red-500'
                    : stage.count > 2
                      ? '[&>div]:bg-yellow-500'
                      : '[&>div]:bg-green-500'
                }`}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            Processing time: ~{avgProcessingDays} days avg
          </p>
        </div>
      ) : (
        <div className="text-center text-muted-foreground py-4">No bottleneck data available</div>
      )}
    </CardContent>
  </Card>
);

export default ApprovalBottleneckCard;
