import { redirectToOriginLogin } from "./authRedirect";

export const AP_HISTORY_INITIALIZED = "__ap_logout_boundary_initialized__";

export const completeApLogout = (logout) => {
  sessionStorage.removeItem(AP_HISTORY_INITIALIZED);
  logout();
  redirectToOriginLogin();
};
