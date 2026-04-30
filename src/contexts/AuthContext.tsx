import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_DEBUG = true;
const authLog = (...args: unknown[]) => {
  if (AUTH_DEBUG) console.log("[AUTH]", new Date().toISOString().slice(11, 23), ...args);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  authLog("AuthProvider render — user:", user?.id ?? "null", "loading:", loading);

  useEffect(() => {
    authLog("useEffect mount — starting ensureSession");

    const isAnonDisabledError = (error: unknown) => {
      const msg = String(error ?? "").toLowerCase();
      return msg.includes("anonymous sign-ins are disabled");
    };

    const ensureSession = async () => {
      authLog("ensureSession called");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        authLog("getSession result:", session ? `session exists, user=${session.user.id}` : "no session");

        if (session) {
          setSession(session);
          setUser(session.user);
          return;
        }

        authLog("no session → calling signInAnonymously");
        const { data, error } = await supabase.auth.signInAnonymously();
        authLog("signInAnonymously result — error:", error, "data:", data);
        if (error) {
          authLog("signInAnonymously error:", error.status, error.message);
          if (!isAnonDisabledError(error)) {
            throw error;
          }
          return;
        }

        setSession(data.session ?? null);
        setUser(data.user ?? null);
      } catch (error) {
        console.error("Failed to initialize auth session:", error);
      } finally {
        authLog("ensureSession finally → setLoading(false)");
        setLoading(false);
      }
    };

    void ensureSession();

    // Single auth state listener for the entire app
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      authLog("onAuthStateChange event:", event, "session:", session ? `user=${session.user.id}` : "null");
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        authLog("SIGNED_OUT → calling signInAnonymously again");
        void supabase.auth.signInAnonymously().catch((error) => {
          authLog("signInAnonymously after SIGNED_OUT error:", error);
          if (!isAnonDisabledError(error)) {
            console.error("Failed to create anonymous session after sign out:", error);
          }
        });
      }
    });

    return () => {
      authLog("useEffect cleanup — unsubscribing");
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ user, session, loading }), [user, session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
