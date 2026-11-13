"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Tenant } from "@/types";
import { api, clearSelectedTenant, getStoredAuth, setAuthToken, setSelectedTenant } from "@/lib/api";
import { deriveCaps, employeeHome, globalRole, homePath as landingPath, RoleId } from "@/lib/permissions";

interface AvailableTenant {
  id: string;
  business_name: string;
  is_active?: boolean;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  availableTenants: AvailableTenant[];
  token: string | null;
  loading: boolean;
  login: (username: string, password: string, tenantId?: string) => Promise<boolean>;
  logout: () => void;
  refreshTenant: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  toggleActive: (isActive?: boolean) => Promise<boolean>;
  /** Global flag only: superadmin | demo_manager | null (access is per company, see `permissions`). */
  role: RoleId | null;
  permissions: string[];
  allowedEmployees: string[];
  can: (cap: string) => boolean;
  hasEmployee: (employeeId: string) => boolean;
  /** Start page of an AI employee for this user (Vera: dashboard, or chats without `dashboards`). */
  employeeHome: (employeeId: string) => string;
  /** Where this user lands after login: the AI staff list, or the only AI employee they have. */
  homePath: string;
  /** True when the user sees only one AI employee, so the AI staff list is skipped. */
  singleEmployee: boolean;
}

interface AuthPayload {
  user: User;
  permissions?: string[];
  allowed_employees?: string[];
  /** "all" = every AI employee (also future ones), "selected" = only `allowed_employees`. Old backends: absent. */
  employee_scope?: "all" | "selected";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<AvailableTenant[]>([]);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [allowedEmployees, setAllowedEmployees] = useState<string[]>([]);
  const [employeeScope, setEmployeeScope] = useState<"all" | "selected">("all");

  // Old backends send neither field: derive from the role and open every AI employee.
  const applyPayload = (res: AuthPayload) => {
    setPermissions(Array.from(deriveCaps(res.user, res.permissions)));
    setAllowedEmployees(
      Array.isArray(res.allowed_employees) ? res.allowed_employees : ["*"]
    );
    setEmployeeScope(res.employee_scope === "selected" ? "selected" : "all");
  };

  const role: RoleId | null = globalRole(user);
  const can = (cap: string) => role === "superadmin" || permissions.includes(cap);
  const hasEmployee = (employeeId: string) =>
    role === "superadmin" || allowedEmployees.includes("*") || allowedEmployees.includes(employeeId);
  const homeOf = (employeeId: string) => employeeHome(employeeId, can("dashboards"));
  const homePath = landingPath(role === "superadmin", employeeScope === "all" ? ["*"] : allowedEmployees, can("dashboards"));
  const singleEmployee = homePath !== "/";

  useEffect(() => {
    async function initAuth() {
      if (typeof window !== "undefined") {
        const p = (window.location.pathname || "").replace(/\/+$/, "") || "/";
        if (p === "/c" || p.startsWith("/c/")) {
          setLoading(false);
          return;
        }
      }

      const { token: savedToken } = getStoredAuth();
      if (savedToken) {
        setTokenState(savedToken);
        try {
          let res;
          try {
            res = await api.getMe();
          } catch (e) {
            // The remembered company may no longer be open to this account (membership removed): forget it and
            // let the backend pick the default company instead of logging the user out.
            if (!getStoredAuth().tenantId) throw e;
            clearSelectedTenant();
            res = await api.getMe();
          }
          if (res.ok && res.tenant) setSelectedTenant(res.tenant.id);
          if (res.ok && res.user && res.tenant) {
            setUser(res.user);
            setTenant(res.tenant);
            applyPayload(res);
            if (res.available_tenants) {
              setAvailableTenants(res.available_tenants);
            }
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
        applyPayload(res);
        setTokenState(res.token);
        if (res.available_tenants) {
          setAvailableTenants(res.available_tenants);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    // Revoke the session on the server first (it needs the token), then clear local state either way.
    void api.logout().finally(() => {
      setAuthToken(null, null);
      setUser(null);
      setTenant(null);
      setAvailableTenants([]);
      setTokenState(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    });
  };

  const refreshTenant = async () => {
    try {
      const res = await api.getMe();
      if (res.ok && res.tenant) {
        setTenant(res.tenant);
        if (res.user) applyPayload(res);
        if (res.available_tenants) {
          setAvailableTenants(res.available_tenants);
        }
      }
    } catch (e) {
      console.error("Failed to refresh tenant", e);
    }
  };

  const switchTenant = async (newTenantId: string) => {
    setSelectedTenant(newTenantId);
    try {
      const res = await api.getMe();
      if (res.ok && res.tenant) {
        setTenant(res.tenant);
        if (res.user) applyPayload(res);
        if (res.available_tenants) {
          setAvailableTenants(res.available_tenants);
        }
      }
    } catch (e) {
      console.error("Failed to switch tenant", e);
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
        availableTenants,
        token,
        loading,
        login,
        logout,
        refreshTenant,
        switchTenant,
        toggleActive,
        role,
        permissions,
        allowedEmployees,
        can,
        hasEmployee,
        employeeHome: homeOf,
        homePath,
        singleEmployee,
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
