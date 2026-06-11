import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../ui/button";

const RefreshButton = ({
  refreshing = false,
  children = "Refresh",
  className = "",
  ...props
}) => (
  <Button
    {...props}
    variant="outline"
    disabled={refreshing || props.disabled}
    className={className}
  >
    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
    {children}
  </Button>
);

export default RefreshButton;
