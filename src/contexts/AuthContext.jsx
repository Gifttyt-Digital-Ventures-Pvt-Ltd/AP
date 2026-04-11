import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  useCorporateLoginMutation,
  useGetCorporatesByEmailMutation,
  useSendCorporateLoginOtpMutation,
} from '../Services/serviceApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [corporateLoginMutation] = useCorporateLoginMutation();
  const [getCorporatesMutation] = useGetCorporatesByEmailMutation();
  const [sendCorporateLoginOtpMutation] = useSendCorporateLoginOtpMutation();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const storedToken = sessionStorage.getItem('token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

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



