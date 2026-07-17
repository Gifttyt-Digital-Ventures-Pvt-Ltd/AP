import React from "react";

import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";

const IntegrationProviderLayout = ({ alert, children }) => (
  <div className="space-y-5">
    {alert ? (
      <Alert className="border-amber-200 bg-amber-50 text-amber-900">
        <AlertTitle>{alert.title}</AlertTitle>
        <AlertDescription>{alert.description}</AlertDescription>
      </Alert>
    ) : null}
    {children}
  </div>
);

export default IntegrationProviderLayout;
