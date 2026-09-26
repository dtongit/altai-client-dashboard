"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Tenant } from "@/types";
import { api, getStoredAuth, setAuthToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string, tenantId?: string) => Promise<boolean>;
  logout: () => void;
  refreshTenant: () => Promise<void>;
  toggleActive: (isActive?: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const { token: savedToken } = getStoredAuth();
      if (savedToken) {
        setTokenState(savedToken);
        try {
          const res = await api.getMe();
          if (res.ok && res.user && res.tenant) {
            setUser(res.user);
            setTenant(res.tenant);
          } else {
            setAuthToken(null, null);
            setUser(null);
            setTenant(null);
            setTokenState(null);
          }
        } catch {
          setAuthToken(null, null);
          setUser(null);
          setTenant(null);
          setTokenState(null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (username: string, password: string, tenantId?: string) => {
    try {
      const res = await api.login(username, password, tenantId);
      if (res.ok && res.user && res.tenant) {
        setUser(res.user);
        setTenant(res.tenant);
        setTokenState(res.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setAuthToken(null, null);
    setUser(null);
    setTenant(null);
    setTokenState(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  };

  const refreshTenant = async () => {
    try {
      const res = await api.getMe();
      if (res.ok && res.tenant) {
        setTenant(res.tenant);
      }
    } catch (e) {
      console.error("Failed to refresh tenant", e);
    }
  };

  const toggleActive = async (newActiveState?: boolean) => {
    try {
      const res = await api.toggleSystemActive(newActiveState);
      if (res.ok && tenant) {
        setTenant({ ...tenant, is_active: res.is_active });
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to toggle system active state", e);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        loading,
        login,
        logout,
        refreshTenant,
        toggleActive,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
