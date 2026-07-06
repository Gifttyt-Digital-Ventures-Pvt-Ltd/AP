import {
  ClipboardList,
  FileText,
  Upload,
  Zap,
} from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { GRN_SOURCE, GRN_SOURCE_LABELS, sourceBadgeClass } from '../constants';

const sourceIcons = {
  [GRN_SOURCE.PO]: ClipboardList,
  [GRN_SOURCE.STANDALONE]: FileText,
  [GRN_SOURCE.UPLOAD]: Upload,
  [GRN_SOURCE.FROM_PI]: Zap,
};

const GrnSourceBadge = ({ source }) => {
  const Icon = sourceIcons[source] || FileText;
  const label = GRN_SOURCE_LABELS[source] || source || '—';
  const className = sourceBadgeClass[source] || sourceBadgeClass.STANDALONE;

  return (
    <Badge variant="outline" className={`gap-1 border-0 font-semibold ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

export default GrnSourceBadge;
