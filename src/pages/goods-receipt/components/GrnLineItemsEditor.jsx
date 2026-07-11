import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { formatCurrency } from '../utils';
import {
  isGrnLineColumnEnabled,
  isGrnValuationEnabled,
} from '../utils/grnFormatConfig';

const GrnLineItemsEditor = ({
  lines = [],
  onChange,
  qcEnabled = true,
  poLinked = false,
  formatConfig,
  readOnly = false,
}) => {
  const updateLine = (index, field, value) => {
    const next = lines.map((line, lineIndex) => {
      if (lineIndex !== index) return line;
      const updated = { ...line, [field]: value };

      if (field === 'received_quantity' && qcEnabled) {
        updated.accepted_quantity = value;
        updated.rejected_quantity = 0;
        updated.rejection_reason = '';
      }
      if (field === 'rejected_quantity' && qcEnabled) {
        updated.accepted_quantity = Math.max(
          (Number(updated.received_quantity) || 0) - (Number(value) || 0),
          0,
        );
      }
      if (['received_quantity', 'unit_price'].includes(field)) {
        updated.line_amount =
          (Number(updated.received_quantity) || 0) * (Number(updated.unit_price) || 0);
      }
      return updated;
    });
    onChange(next);
  };

  const addRow = () => {
    onChange([
      ...lines,
      {
        item_code: '',
        item_description: '',
        hsn_sac: '',
        uom: 'PCS',
        ordered_quantity: 0,
        already_received: 0,
        pending_quantity: 0,
        received_quantity: 0,
        accepted_quantity: 0,
        rejected_quantity: 0,
        rejection_reason: '',
        batch_no: '',
        unit_price: 0,
        line_amount: 0,
        gst_rate: 0,
      },
    ]);
  };

  const removeRow = (index) => {
    onChange(lines.filter((_, lineIndex) => lineIndex !== index));
  };

  const totalReceived = lines.reduce((sum, line) => sum + (Number(line.received_quantity) || 0), 0);
  const totalAccepted = lines.reduce((sum, line) => sum + (Number(line.accepted_quantity) || 0), 0);
  const totalRejected = lines.reduce((sum, line) => sum + (Number(line.rejected_quantity) || 0), 0);
  const qcMismatch = qcEnabled && totalReceived > 0 && totalAccepted + totalRejected !== totalReceived;

  const showItemCode = isGrnLineColumnEnabled(formatConfig, 'item_code');
  const showHsn = isGrnLineColumnEnabled(formatConfig, 'hsn_sac');
  const showUom = isGrnLineColumnEnabled(formatConfig, 'uom');
  const showOrdered = poLinked && isGrnLineColumnEnabled(formatConfig, 'ordered_qty');
  const showAlready = poLinked && isGrnLineColumnEnabled(formatConfig, 'already_received');
  const showBatch = isGrnLineColumnEnabled(formatConfig, 'batch_no');
  const showValuation = isGrnValuationEnabled(formatConfig);
  // Master toggle is authoritative — do not also require per-field isEnabled
  // (API often returns valuation_enabled=true with rate/amount/gst_rate still false).
  const showRate = showValuation;
  const showAmount = showValuation;
  const showGstRate = showValuation;
  const taxableAmount = lines.reduce((sum, line) => {
    const amount =
      Number(line.line_amount) ||
      (Number(line.received_quantity) || 0) * (Number(line.unit_price) || 0);
    return sum + amount;
  }, 0);
  const taxAmount = lines.reduce((sum, line) => {
    const amount =
      Number(line.line_amount) ||
      (Number(line.received_quantity) || 0) * (Number(line.unit_price) || 0);
    return sum + (amount * (Number(line.gst_rate) || 0)) / 100;
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Line Items
        </h3>
        {!poLinked && !readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 h-4 w-4" />
            Add Row
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {showItemCode && <TableHead>Item Code</TableHead>}
              <TableHead className="min-w-[180px]">Description</TableHead>
              {showHsn && <TableHead>HSN/SAC</TableHead>}
              {showUom && <TableHead>UOM</TableHead>}
              {showOrdered && <TableHead className="text-muted-foreground">Ordered</TableHead>}
              {showAlready && <TableHead className="text-muted-foreground">Rcvd so far</TableHead>}
              {poLinked && <TableHead className="text-blue-600">Pending</TableHead>}
              <TableHead className="font-semibold text-primary">Received</TableHead>
              {qcEnabled && <TableHead className="text-green-600">Accepted</TableHead>}
              {qcEnabled && <TableHead className="text-red-600">Rejected</TableHead>}
              {qcEnabled && <TableHead>Rejection Reason</TableHead>}
              {showRate && <TableHead className="text-right">Rate</TableHead>}
              {showAmount && <TableHead className="text-right">Amount</TableHead>}
              {showGstRate && <TableHead className="text-right">GST %</TableHead>}
              {showBatch && <TableHead>Batch</TableHead>}
              {!poLinked && !readOnly && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line, index) => {
              const received = Number(line.received_quantity) || 0;
              const accepted = Number(line.accepted_quantity) || 0;
              const rejected = Number(line.rejected_quantity) || 0;
              const lineAmount =
                Number(line.line_amount) ||
                received * (Number(line.unit_price) || 0);
              const qcError = qcEnabled && received > 0 && accepted + rejected !== received;
              const overReceived =
                poLinked && line.pending_quantity > 0 && received > line.pending_quantity;

              return (
                <TableRow key={line.po_line_item_id || line.id || index} className={qcError ? 'bg-red-50/60' : ''}>
                  {showItemCode && (
                    <TableCell>
                      <Input
                        value={line.item_code || ''}
                        onChange={(e) => updateLine(index, 'item_code', e.target.value)}
                        className="h-8 min-w-[90px]"
                        readOnly={readOnly || poLinked}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Input
                      value={line.item_description || ''}
                      onChange={(e) => updateLine(index, 'item_description', e.target.value)}
                      className="h-8 min-w-[160px]"
                      readOnly={readOnly || poLinked}
                    />
                  </TableCell>
                  {showHsn && (
                    <TableCell>
                      <Input
                        value={line.hsn_sac || ''}
                        onChange={(e) => updateLine(index, 'hsn_sac', e.target.value)}
                        className="h-8 w-20"
                        readOnly={readOnly || poLinked}
                      />
                    </TableCell>
                  )}
                  {showUom && (
                    <TableCell>
                      <Input
                        value={line.uom || ''}
                        onChange={(e) => updateLine(index, 'uom', e.target.value)}
                        className="h-8 w-16"
                        readOnly={readOnly || poLinked}
                      />
                    </TableCell>
                  )}
                  {showOrdered && (
                    <TableCell className="text-center text-muted-foreground">{line.ordered_quantity}</TableCell>
                  )}
                  {showAlready && (
                    <TableCell className="text-center text-muted-foreground">{line.already_received}</TableCell>
                  )}
                  {poLinked && (
                    <TableCell className="text-center font-medium text-blue-600">
                      {line.pending_quantity}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        value={line.received_quantity || ''}
                        onChange={(e) =>
                          updateLine(index, 'received_quantity', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-20"
                        readOnly={readOnly}
                        data-testid={`received-qty-${index}`}
                      />
                      {overReceived && (
                        <AlertCircle className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                  </TableCell>
                  {qcEnabled && (
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={line.accepted_quantity || ''}
                        onChange={(e) =>
                          updateLine(index, 'accepted_quantity', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-20"
                        readOnly={readOnly}
                      />
                    </TableCell>
                  )}
                  {qcEnabled && (
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={line.rejected_quantity || ''}
                        onChange={(e) =>
                          updateLine(index, 'rejected_quantity', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-20"
                        readOnly={readOnly}
                        data-testid={`rejected-qty-${index}`}
                      />
                    </TableCell>
                  )}
                  {qcEnabled && (
                    <TableCell>
                      {rejected > 0 ? (
                        <Input
                          value={line.rejection_reason || ''}
                          onChange={(e) => updateLine(index, 'rejection_reason', e.target.value)}
                          placeholder="Reason *"
                          className="h-8 min-w-[120px]"
                          readOnly={readOnly}
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {showRate && (
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={line.unit_price || ''}
                        onChange={(e) =>
                          updateLine(index, 'unit_price', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-24 text-right"
                        readOnly={readOnly}
                      />
                    </TableCell>
                  )}
                  {showAmount && (
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(lineAmount)}
                    </TableCell>
                  )}
                  {showGstRate && (
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={line.gst_rate || ''}
                        onChange={(e) =>
                          updateLine(index, 'gst_rate', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 w-20 text-right"
                        readOnly={readOnly}
                      />
                    </TableCell>
                  )}
                  {showBatch && (
                    <TableCell>
                      <Input
                        value={line.batch_no || ''}
                        onChange={(e) => updateLine(index, 'batch_no', e.target.value)}
                        className="h-8 w-24"
                        readOnly={readOnly}
                      />
                    </TableCell>
                  )}
                  {!poLinked && !readOnly && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeRow(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 px-4 py-2 text-sm">
        <span>
          Received: <strong>{totalReceived}</strong>
        </span>
        {qcEnabled && (
          <span>
            Accepted: <strong className="text-green-600">{totalAccepted}</strong>
          </span>
        )}
        {qcEnabled && (
          <span>
            Rejected: <strong className="text-red-600">{totalRejected}</strong>
          </span>
        )}
        {qcMismatch && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="h-4 w-4" />
            Accepted + Rejected must equal Received
          </span>
        )}
        {showValuation && (
          <>
            <span>
              Taxable: <strong>{formatCurrency(taxableAmount)}</strong>
            </span>
            <span>
              GST: <strong>{formatCurrency(taxAmount)}</strong>
            </span>
            <span>
              Total: <strong>{formatCurrency(taxableAmount + taxAmount)}</strong>
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default GrnLineItemsEditor;
