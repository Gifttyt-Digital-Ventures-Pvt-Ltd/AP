import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";

export const PageShell = ({ title, subtitle, current, children, actions, backTo }) => {
  const navigate = useNavigate();
  const showBack = Boolean(current);

  return (
    <div className="space-y-6" data-testid="accounting-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-start gap-3">
            {showBack ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => navigate(backTo || "/accounting")}
                className="mt-1 h-9 w-9 shrink-0 rounded-full"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div className="min-w-0">
              <h1 className="text-3xl font-bold font-['Manrope'] text-primary">{title}</h1>
              {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
            </div>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
};

export const MetricCard = ({ title, value, subtitle, icon: Icon }) => (
  <div className="rounded-xl border bg-card p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {Icon ? (
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
    </div>
  </div>
);
