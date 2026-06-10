export const redirectToOriginLogin = () => {
  const baseUrl = import.meta.env.VITE_BASE_URL || window.location.origin;
  window.location.assign(`${baseUrl.replace(/\/+$/, "")}/login`);
};
