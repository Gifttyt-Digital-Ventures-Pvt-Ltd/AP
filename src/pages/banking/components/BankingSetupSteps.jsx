import React from "react";
import { CheckCircle2 } from "lucide-react";
import { GATE_STATE } from "../constants";

const STEPS = [
  { key: GATE_STATE.ACCOUNT_PENDING, label: "Link Account" },
  { key: GATE_STATE.CIB_PENDING, label: "CIB Registration" },
];

const BankingSetupSteps = ({ gateState }) => {
  const currentIndex =
    gateState === GATE_STATE.ACCOUNT_PENDING
      ? 0
      : gateState === GATE_STATE.CIB_PENDING
        ? 1
        : 2;

  return (
    <div className="flex flex-wrap gap-2">
      {STEPS.map((step, index) => {
        const done = index < currentIndex || gateState === GATE_STATE.READY || gateState === GATE_STATE.BENEFICIARY_PENDING;
        const active = index === currentIndex && gateState !== GATE_STATE.READY && gateState !== GATE_STATE.BENEFICIARY_PENDING;

        return (
          <div
            key={step.key}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              done
                ? "border-green-200 bg-green-50 text-green-800"
                : active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
            }`}
          >
            {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
            {step.label}
          </div>
        );
      })}
    </div>
  );
};

export default BankingSetupSteps;
