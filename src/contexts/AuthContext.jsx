import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  useCorporateLoginMutation,
  useGetCorporatesByEmailMutation,
  useLazyExchangeHandoffTokenQuery,
  useSendCorporateLoginOtpMutation,
} from '../Services/serviceApi';
import { redirectToOriginLogin } from '../utils/authRedirect';

const AuthContext = createContext(null);

const decodeBase64 = (value = "") => {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    return atob(padded);
  } catch {
    return null;
  }
};

const parseJwtPayload = (token = "") => {
  const tokenParts = String(token).split(".");
  if (tokenParts.length !== 3) return null;

  const decodedPayload = decodeBase64(tokenParts[1]);
  if (!decodedPayload) return null;

  try {
    return JSON.parse(decodedPayload);
  } catch {
    return null;
  }
};

const resolveUserFromExchangeResponse = (response = {}) => {
  const responseUser =
    response?.user ||
    response?.corporateUser ||
    response?.data?.user;

  if (responseUser) return responseUser;

  const authToken = response?.authToken;
  const decodedToken = decodeBase64(authToken);
  const jwtPayload = parseJwtPayload(authToken) || parseJwtPayload(decodedToken);

  if (!jwtPayload) {
    return { name: "User", role: "Admin" };
  }

  return {
    id: jwtPayload.id || jwtPayload.jti || jwtPayload.sub || jwtPayload.identifier,
    name: jwtPayload.name || jwtPayload.identifier || jwtPayload.email || "User",
    email: jwtPayload.email || jwtPayload.identifier,
    corpId: jwtPayload.corpId,
    role: jwtPayload.role || jwtPayload.authorities,
  };
};

export const AuthProvider = ({ children }) => {
  const [corporateLoginMutation] = useCorporateLoginMutation();
  const [getCorporatesMutation] = useGetCorporatesByEmailMutation();
  const [sendCorporateLoginOtpMutation] = useSendCorporateLoginOtpMutation();
  const [exchangeHandoffToken] = useLazyExchangeHandoffTokenQuery();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedUser = sessionStorage.getItem('user');
      const storedToken = sessionStorage.getItem('token');

      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
        } catch {
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('tokenExpiry');
          setToken(null);
        }
        setLoading(false);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const handoffToken = params.get("token");

      if (!handoffToken) {
        redirectToOriginLogin();
        return;
      }

      try {
        const response = await exchangeHandoffToken(handoffToken).unwrap();
        const tokenValue = response?.authToken;
        const userData = resolveUserFromExchangeResponse(response);

        if (!tokenValue) {
          throw new Error("Invalid handoff token exchange response");
        }

        sessionStorage.setItem("token", tokenValue);
        sessionStorage.setItem("user", JSON.stringify(userData));
        const tokenExpiry = response?.validTill || response?.expiry;
        if (tokenExpiry) {
          sessionStorage.setItem("tokenExpiry", String(tokenExpiry));
        }

        setToken(tokenValue);
        setUser(userData);
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('tokenExpiry');
        redirectToOriginLogin();
        return;
      }

      setLoading(false);
    };

    initializeAuth();
  }, [exchangeHandoffToken]);

  const login = async (email, otp, corpId = null) => {
    const response = await corporateLoginMutation({
      email,
      otp,
      ...(corpId ? { corpId } : {}),
    }).unwrap();
    const tokenValue = response?.authToken;
    const userData =
      response?.user ||
      response?.corporateUser ||
      response?.data?.user ||
      { name: email, role: "Admin" };

    if (tokenValue) {
      sessionStorage.setItem("token", tokenValue);
      sessionStorage.setItem("user", JSON.stringify(userData));
      if (response?.validTill) {
        sessionStorage.setItem("tokenExpiry", String(response.validTill));
      }
      setToken(tokenValue);
      setUser(userData);
      return userData;
    }
    throw new Error("Corporate login did not return authToken");
  };

  const getCorporatesByEmail = async (email) => {
    return getCorporatesMutation({ email }).unwrap();
  };

  const sendCorporateLoginOtp = async (email, corpId) => {
    return sendCorporateLoginOtpMutation({ email, corpId }).unwrap();
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('tokenExpiry');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      loading,
      getCorporatesByEmail,
      sendCorporateLoginOtp,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
