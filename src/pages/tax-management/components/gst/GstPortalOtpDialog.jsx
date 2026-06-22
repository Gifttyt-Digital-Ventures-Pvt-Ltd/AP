import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
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
import { cn } from '../../../../lib/utils';

const GST_PORTAL_OTP_LENGTH = 6;

const GstPortalOtpDialog = ({
  open,
  onOpenChange,
  gstin = '',
  contextLabel = 'GST Portal',
  onVerified,
}) => {
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setOtp('');
      setLoading(false);
    }
  }, [open]);

  const handleGenerateOtp = () => {
    setLoading(true);
    window.setTimeout(() => {
      setStep(2);
      setLoading(false);
    }, 800);
  };

  const handleVerifyOtp = () => {
    if (otp.trim().length !== GST_PORTAL_OTP_LENGTH) return;
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      onVerified?.(otp.trim());
    }, 600);
  };

  const handleResendOtp = () => {
    setOtp('');
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  const steps = ['Request OTP', 'Verify OTP'];

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

        <div className="mb-2 flex items-center">
          {steps.map((label, index) => {
            const stepNumber = index + 1;
            const done = step > stepNumber;
            const active = step === stepNumber;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      'grid h-8 w-8 place-items-center rounded-full text-xs font-bold',
                      done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : stepNumber}
                  </div>
                  <span className={cn('text-[11px]', active ? 'font-semibold text-primary' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </div>
                {index < steps.length - 1 ? (
                  <div className={cn('mx-3 mb-5 h-0.5 flex-1', step > stepNumber ? 'bg-green-500' : 'bg-muted')} />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>

        {step === 1 ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <p className="text-sm text-muted-foreground">
              An OTP will be sent to the mobile number and email registered on the GST portal for this GSTIN.
            </p>
            <Button type="button" onClick={handleGenerateOtp} disabled={!gstin || loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Requesting OTP…' : 'Send OTP'}
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900">
              OTP sent to the registered contact for GSTIN <strong className="font-mono">{gstin}</strong>.
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
              />
              <p className="text-xs text-muted-foreground">
                Enter the {GST_PORTAL_OTP_LENGTH}-digit code received on your registered GST portal contact.
              </p>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 2 ? (
            <>
              <Button type="button" variant="ghost" onClick={handleResendOtp} disabled={loading}>
                Resend OTP
              </Button>
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otp.length !== GST_PORTAL_OTP_LENGTH || loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GstPortalOtpDialog;
