import React, { createContext, useState, useContext, useEffect } from 'react';
import { useCorporateLoginMutation, useLoginMutation, useRegisterMutation } from '../Services/apiSlice';

const AuthContext = createContext(null);
const AUTH_PROVIDER = import.meta.env.VITE_AUTH_PROVIDER ?? "ap";

export const AuthProvider = ({ children }) => {
  const [loginMutation] = useLoginMutation();
  const [corporateLoginMutation] = useCorporateLoginMutation();
  const [registerMutation] = useRegisterMutation();
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

  const login = async (email, password) => {
    if (AUTH_PROVIDER === "corporate") {
      const response = await corporateLoginMutation({ email, otp: password }).unwrap();
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
    }

    const response = await loginMutation({ email, password }).unwrap();
    const { access_token, user: userData } = response;

    sessionStorage.setItem("token", access_token);
    sessionStorage.setItem("user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);

    return userData;
  };

  const register = async (email, password, name, role = 'Maker') => {
    const response = await registerMutation({ email, password, name, role }).unwrap();
    const { access_token, user: userData } = response;
    
    sessionStorage.setItem('token', access_token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('tokenExpiry');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
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



