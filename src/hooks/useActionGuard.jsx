import { useCallback } from "react";
import { toast } from "sonner";
import { useRBAC } from "../contexts/RBACContext";

export const useActionGuard = () => {
  const { canPerformAction, isLoaded } = useRBAC();

  const guardAction = useCallback(
    (actionKey, message = "You do not have permission to perform this action") => {
      if (!isLoaded) {
        toast.error("Checking permissions. Please try again.");
        return false;
      }

      if (canPerformAction(actionKey)) {
        return true;
      }

      toast.error(message);
      return false;
    },
    [canPerformAction, isLoaded],
  );

  return {
    guardAction,
    canPerformAction,
  };
};
