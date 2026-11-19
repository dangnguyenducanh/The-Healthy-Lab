"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, hasSessionHint } from "./api";
import type { User } from "./types";

type RegisterInput = { name: string; email: string; password: string; phone?: string; address?: string };

type AuthValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSessionHint()) {
      // The session hint is a browser cookie, readable only after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const signedIn = await api<User>("/auth/login", { method: "POST", json: { email, password } });
    setUser(signedIn);
    return signedIn;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const created = await api<User>("/auth/register", { method: "POST", json: input });
    setUser(created);
    return created;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<void>("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth outside AuthProvider");
  return value;
}

/** A path inside this site to return to after signing in; anything else falls back to "/". */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  // A same-site path only: no "//host", no "/\host" (browsers read a backslash as a slash).
  return next && next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : fallback;
}
