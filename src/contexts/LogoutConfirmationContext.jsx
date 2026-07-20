import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

const DEFAULT_LOGOUT_COPY =
  "You will be logged out of the AP Portal and redirected to the login page.";

const LogoutConfirmationContext = createContext({
  requestLogoutConfirmation: () => Promise.resolve(false),
});

export const LogoutConfirmationProvider = ({ children }) => {
  const resolverRef = useRef(null);
  const [dialogState, setDialogState] = useState({
    open: false,
    description: DEFAULT_LOGOUT_COPY,
  });

  const requestLogoutConfirmation = useCallback((options = {}) => {
    if (resolverRef.current) {
      return resolverRef.current.promise;
    }

    let resolvePromise;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    resolverRef.current = { promise, resolve: resolvePromise };

    setDialogState({
      open: true,
      description: options.description || DEFAULT_LOGOUT_COPY,
    });

    return promise;
  }, []);

  const resolveDialog = useCallback((confirmed) => {
    resolverRef.current?.resolve(Boolean(confirmed));
    resolverRef.current = null;
    setDialogState((current) => ({ ...current, open: false }));
  }, []);

  const value = useMemo(
    () => ({ requestLogoutConfirmation }),
    [requestLogoutConfirmation],
  );

  return (
    <LogoutConfirmationContext.Provider value={value}>
      {children}
      <AlertDialog
        open={dialogState.open}
        onOpenChange={(open) => {
          if (!open) resolveDialog(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>{dialogState.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay logged in</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                resolveDialog(true);
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LogoutConfirmationContext.Provider>
  );
};

export const useLogoutConfirmation = () => useContext(LogoutConfirmationContext);
