import { createContext, useContext, useState, useCallback } from "react";
import { login as loginRequest } from "../services/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "verifyai_token";
const OFFICER_KEY = "verifyai_officer";

export function AuthProvider({ children }) {
  const [officer, setOfficer] = useState(() => {
    const raw = localStorage.getItem(OFFICER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(async (email, password) => {
    const { token, officer } = await loginRequest(email, password);
    localStorage.setItem(STORAGE_KEY, token);
    localStorage.setItem(OFFICER_KEY, JSON.stringify(officer));
    setOfficer(officer);
    return officer;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(OFFICER_KEY);
    setOfficer(null);
  }, []);

  const isAuthenticated = Boolean(officer && localStorage.getItem(STORAGE_KEY));

  return (
    <AuthContext.Provider value={{ officer, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
