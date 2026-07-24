import { CheckCircle, Clock, ClipboardCheck, Package } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { GRN_STATUS } from '../constants';

const GrnStatsCards = ({ grns = [], pendingPoCount = 0 }) => {
  const total = grns.length;
  const draft = grns.filter((g) => g.status === GRN_STATUS.DRAFT).length;
  const pending = grns.filter((g) => g.status === GRN_STATUS.PENDING_APPROVAL).length;
  const approved = grns.filter((g) => g.status === GRN_STATUS.APPROVED).length;

  const cards = [
    { label: 'Total GRNs', value: total, icon: ClipboardCheck, iconClass: 'text-muted-foreground' },
    { label: 'Pending Approval', value: pending, icon: Clock, iconClass: 'text-amber-500' },
    { label: 'Approved', value: approved, icon: CheckCircle, iconClass: 'text-green-500' },
    { label: 'Drafts', value: draft, icon: Package, iconClass: 'text-muted-foreground' },
    { label: 'POs Pending Receipt', value: pendingPoCount, icon: Package, iconClass: 'text-yellow-500' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between pt-4">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <Icon className={`h-8 w-8 ${card.iconClass}`} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default GrnStatsCards;
