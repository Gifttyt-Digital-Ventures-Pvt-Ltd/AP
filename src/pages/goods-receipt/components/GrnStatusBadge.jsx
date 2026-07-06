import { Badge } from '../../../components/ui/badge';
import { getGrnStatusLabel } from '../utils';
import { statusBadgeClass } from '../constants';

const GrnStatusBadge = ({ status }) => {
  const label = getGrnStatusLabel(status);
  const className = statusBadgeClass[status] || statusBadgeClass[label] || statusBadgeClass.DRAFT;

  return (
    <Badge variant="outline" className={`border-0 font-semibold ${className}`}>
      {label}
    </Badge>
  );
};

export default GrnStatusBadge;
