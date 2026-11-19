"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Tenant } from "@/types";
import { api, clearSelectedTenant, clearStoredAuth, dropLegacyToken, getStoredAuth, legacyToken, setSelectedTenant } from "@/lib/api";
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
  /** Signed in without a tenant and with a partner profile (`GET /partner/me` answered): lands on /partner. */
  partnerOnly: boolean;
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
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [allowedEmployees, setAllowedEmployees] = useState<string[]>([]);
  const [employeeScope, setEmployeeScope] = useState<"all" | "selected">("all");
  const [partnerOnly, setPartnerOnly] = useState(false);

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

  // A tenant-less account with a partner profile is a partner. `known` = the user from /auth/me, if it answered.
  const adoptPartner = async (known: User | null): Promise<boolean> => {
    try {
      const me = await api.partnerMe();
      setUser(
        known ?? {
          id: me.profile.user_id,
          username: me.username,
          email: "",
          is_admin: false,
          role: "partner",
        }
      );
      setTenant(null);
      setPermissions([]);
      setAllowedEmployees([]);
      setPartnerOnly(true);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    async function initAuth() {
      if (typeof window !== "undefined") {
        const p = (window.location.pathname || "").replace(/\/+$/, "") || "/";
        if (p === "/c" || p.startsWith("/c/")) {
          setLoading(false);
          return;
        }
      }

      // The session is the API-host cookie (#440): /auth/me decides whether we are signed in.
      const signedOut = () => {
        clearStoredAuth();
        setUser(null);
        setTenant(null);
      };
      const me = async () => {
        try {
          return await api.getMe();
        } catch (e: any) {
          // A pre-#440 token in localStorage that is no longer valid must not hide a valid cookie.
          if (e?.status === 401 && legacyToken()) {
            dropLegacyToken();
            return await api.getMe();
          }
          throw e;
        }
      };
      try {
        let res;
        try {
          res = await me();
        } catch (e: any) {
          // The remembered company may no longer be open to this account (membership removed): forget it and
          // let the backend pick the default company instead of logging the user out.
          if (e?.status === 401 || !getStoredAuth().tenantId) throw e;
          clearSelectedTenant();
          res = await me();
        }
        // /auth/me answered, so the cookie session is set: the old localStorage token is no longer needed.
        dropLegacyToken();
        if (res.ok && res.tenant) setSelectedTenant(res.tenant.id);
        if (res.ok && res.user && res.tenant) {
          setUser(res.user);
          setTenant(res.tenant);
          applyPayload(res);
          if (res.available_tenants) {
            setAvailableTenants(res.available_tenants);
          }
        } else if (res.ok && res.user && (await adoptPartner(res.user))) {
          // Partner account: no tenant, only a partner profile.
        } else {
          signedOut();
        }
      } catch (e: any) {
        // A partner account may have no tenant, so /auth/me can fail for it: the partner profile decides.
        if (e?.status === 401 || !(await adoptPartner(null))) {
          signedOut();
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
        setPartnerOnly(false);
        applyPayload(res);
        if (res.available_tenants) {
          setAvailableTenants(res.available_tenants);
        }
        return true;
      }
      if (res.ok && res.user && !res.tenant) {
        return await adoptPartner(res.user);
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    // Revoke the session on the server first (it clears the cookie for every host), then local state either way.
    void api.logout().finally(() => {
      clearStoredAuth();
      setUser(null);
      setTenant(null);
      setAvailableTenants([]);
      setPartnerOnly(false);
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
        partnerOnly,
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
