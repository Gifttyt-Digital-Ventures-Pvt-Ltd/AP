import { useCallback, useRef, useState } from 'react';

export function useGstPortalOtp() {
  const [open, setOpen] = useState(false);
  const [gstin, setGstin] = useState('');
  const [contextLabel, setContextLabel] = useState('');
  const pendingActionRef = useRef(null);
  const pendingCancelRef = useRef(null);

  const requestOtpForFetch = useCallback(({ gstin: nextGstin, contextLabel: nextLabel, onVerified, onCancelled }) => {
    setGstin(nextGstin ?? '');
    setContextLabel(nextLabel ?? 'GST Portal');
    pendingActionRef.current = onVerified ?? null;
    pendingCancelRef.current = onCancelled ?? null;
    setOpen(true);
  }, []);

  const handleVerified = useCallback((otp) => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;
    pendingCancelRef.current = null;
    setOpen(false);
    pendingAction?.(otp);
  }, []);

  const handleOpenChange = useCallback((nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      const pendingCancel = pendingCancelRef.current;
      pendingActionRef.current = null;
      pendingCancelRef.current = null;
      pendingCancel?.();
    }
  }, []);

  return {
    open,
    gstin,
    contextLabel,
    requestOtpForFetch,
    handleVerified,
    handleOpenChange,
  };
}
