import { useCallback, useRef, useState } from 'react';

export function useGstPortalOtp() {
  const [open, setOpen] = useState(false);
  const [gstin, setGstin] = useState('');
  const [contextLabel, setContextLabel] = useState('');
  const pendingActionRef = useRef(null);

  const requestOtpForFetch = useCallback(({ gstin: nextGstin, contextLabel: nextLabel, onVerified }) => {
    setGstin(nextGstin ?? '');
    setContextLabel(nextLabel ?? 'GST Portal');
    pendingActionRef.current = onVerified ?? null;
    setOpen(true);
  }, []);

  const handleVerified = useCallback((otp) => {
    setOpen(false);
    pendingActionRef.current?.(otp);
    pendingActionRef.current = null;
  }, []);

  const handleOpenChange = useCallback((nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      pendingActionRef.current = null;
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
