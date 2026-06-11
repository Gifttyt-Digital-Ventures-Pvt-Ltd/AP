import React from "react";
import { CheckCircle2, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { CIB_STATE } from "../constants";

const CibRegistrationCard = ({
  cibStatus,
  onRegister,
  onRecheck,
  registering = false,
  rechecking = false,
  canManage = false,
  readOnly = false,
  locked = false,
}) => {
  if (locked) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            ICICI CIB Registration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Link your ICICI account first. CIB registration becomes available after the account is verified.
          </p>
        </CardContent>
      </Card>
    );
  }

  const state = cibStatus?.state || CIB_STATE.NOT_STARTED;

  if (state === CIB_STATE.REGISTERED) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">ICICI CIB Registration</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          CIB registration complete
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ICICI CIB Registration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === CIB_STATE.NOT_STARTED && (
          <>
            <p className="text-sm text-muted-foreground">
              Register with ICICI CIB to enable NEFT/RTGS payouts and beneficiary management.
            </p>
            {readOnly ? (
              <p className="text-sm text-amber-800">
                Complete CIB registration in Settings → Connected Banking.
              </p>
            ) : (
              canManage && (
                <Button onClick={onRegister} disabled={registering}>
                  {registering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Register with CIB
                </Button>
              )
            )}
          </>
        )}

        {state === CIB_STATE.PENDING_SELF_APPROVAL && (
          <>
            <p className="text-sm">
              Registration submitted. <strong>Log in to ICICI CIB and approve it</strong> from your{" "}
              <em>Pending on Me</em> tray to activate.
            </p>
            {cibStatus?.message && (
              <p className="text-xs text-muted-foreground">{cibStatus.message}</p>
            )}
            {readOnly ? (
              <p className="text-sm text-muted-foreground">
                After approving in ICICI CIB, refresh status from Settings → Connected Banking.
              </p>
            ) : (
              canManage && (
                <Button variant="outline" onClick={onRecheck} disabled={rechecking}>
                  {rechecking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  I&apos;ve approved — recheck
                </Button>
              )
            )}
          </>
        )}

        {state === CIB_STATE.FAILED && (
          <>
            <p className="text-sm text-red-700">
              {cibStatus?.message || "CIB registration failed. Please retry or contact your RM."}
            </p>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">
                Retry CIB registration from Settings → Connected Banking.
              </p>
            ) : (
              canManage && (
                <Button onClick={onRegister} disabled={registering}>
                  {registering && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Retry Registration
                </Button>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CibRegistrationCard;
