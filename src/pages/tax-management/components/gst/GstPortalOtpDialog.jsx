import React, { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../components/ui/dialog';

const GST_PORTAL_OTP_LENGTH = 6;

const GstPortalOtpDialog = ({
  open,
  onOpenChange,
  gstin = '',
  contextLabel = 'GST Portal',
  onVerified,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setOtp('');
      setLoading(false);
    }
  }, [open]);

  const handleVerifyOtp = () => {
    if (otp.trim().length !== GST_PORTAL_OTP_LENGTH) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onVerified?.(otp.trim());
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            GST Portal Verification
          </DialogTitle>
          <DialogDescription>
            {contextLabel} requires OTP verification for organisation GSTIN{' '}
            <span className="font-mono font-medium text-foreground">{gstin || '—'}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
            OTP has been sent to the registered contact for GSTIN{' '}
            <strong className="font-mono">{gstin || '—'}</strong>.
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gst-portal-otp">Enter OTP *</Label>
            <Input
              id="gst-portal-otp"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, GST_PORTAL_OTP_LENGTH))}
              placeholder={`${GST_PORTAL_OTP_LENGTH}-digit OTP`}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="font-mono tracking-[0.3em]"
              maxLength={GST_PORTAL_OTP_LENGTH}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the {GST_PORTAL_OTP_LENGTH}-digit code received on your registered GST portal contact.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleVerifyOtp}
            disabled={otp.length !== GST_PORTAL_OTP_LENGTH || loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Verifying…' : 'Verify & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GstPortalOtpDialog;
