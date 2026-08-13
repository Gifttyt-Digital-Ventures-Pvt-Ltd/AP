import React from "react";
import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { providerRoutes } from "../providerDefinitions";

const IntegrationModuleLayout = ({
  title = "Integrations",
  description = "Manage email ingestion and ERP integrations from one place.",
  breadcrumbPage,
  actions,
  children,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (breadcrumbPage) {
      navigate(providerRoutes.overview);
      return;
    }
    navigate(-1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background p-6">
      {breadcrumbPage ? (
        <div className="mb-4">
          <Button type="button" variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      ) : null}

      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="mb-2 text-4xl font-bold font-['Manrope'] text-primary md:text-5xl">
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      {children}
    </div>
  );
};

export default IntegrationModuleLayout;
