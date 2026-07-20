export const redirectToOriginLogin = () => {
  const base = import.meta.env.VITE_BASE_URL?.replace(/\/$/, "");
  const loginUrl = base ? `${base}/login` : "/login";
  window.location.replace(loginUrl);
};
