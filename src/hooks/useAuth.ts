import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ensureSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setUser(session.user);
          return;
        }

        const { data, error } = await supabase.auth.signInAnonymously();
        if (error) throw error;

        setUser(data.user ?? null);
      } catch (error) {
        console.error("Failed to initialize auth session:", error);
      } finally {
        setLoading(false);
      }
    };

    void ensureSession();

    // האזן לשינויים באימות
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        void supabase.auth.signInAnonymously().catch((error) => {
          console.error("Failed to create anonymous session after sign out:", error);
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};
