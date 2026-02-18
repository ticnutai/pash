import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Book, Eye, EyeOff } from "lucide-react";

const REMEMBER_ME_KEY = "torah_remember_me";
const AUTO_LOGIN_KEY = "torah_auto_login";

export const getRememberedCredentials = () => {
  try {
    const stored = localStorage.getItem(REMEMBER_ME_KEY);
    if (stored) return JSON.parse(stored) as { email: string; password: string };
  } catch {}
  return null;
};

export const getAutoLoginEnabled = () => {
  return localStorage.getItem(AUTO_LOGIN_KEY) === "true";
};

export const setAutoLoginEnabled = (enabled: boolean) => {
  localStorage.setItem(AUTO_LOGIN_KEY, enabled ? "true" : "false");
};

export const clearRememberedCredentials = () => {
  localStorage.removeItem(REMEMBER_ME_KEY);
  localStorage.removeItem(AUTO_LOGIN_KEY);
};

export const Auth = () => {
  const remembered = getRememberedCredentials();
  const [email, setEmail] = useState(remembered?.email || "");
  const [password, setPassword] = useState(remembered?.password || "");
  const [displayName, setDisplayName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(!!remembered);
  const [attemptedAutoLogin, setAttemptedAutoLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
        return;
      }

      // Auto-login if enabled and credentials are remembered
      if (!attemptedAutoLogin && getAutoLoginEnabled() && remembered) {
        setAttemptedAutoLogin(true);
        setIsLoading(true);
        supabase.auth.signInWithPassword({
          email: remembered.email,
          password: remembered.password,
        }).then(({ error }) => {
          if (!error) {
            navigate("/");
          } else {
            setIsLoading(false);
            // Credentials invalid, clear them
            clearRememberedCredentials();
            setRememberMe(false);
          }
        });
      }
    });
  }, [navigate, attemptedAutoLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Save or clear remembered credentials
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ email, password }));
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY);
          localStorage.removeItem(AUTO_LOGIN_KEY);
        }

        toast.success("התחברת בהצלחה!");
        navigate("/");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;
        toast.success("נרשמת בהצלחה! מעבירים אותך...");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("אימייל או סיסמה שגויים");
      } else if (error.message?.includes("User already registered")) {
        toast.error("המשתמש כבר רשום במערכת");
      } else {
        toast.error(error.message || "שגיאה באימות");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while auto-login is in progress
  if (isLoading && attemptedAutoLogin && !email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Book className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? "התחברות" : "הרשמה"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "הכנס את הפרטים שלך להתחברות"
              : "צור חשבון חדש כדי להתחיל"}
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">שם תצוגה</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="השם שיוצג באפליקציה"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-right"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-right"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="text-right pl-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {!isLogin && (
                <p className="text-xs text-muted-foreground text-right">
                  לפחות 6 תווים
                </p>
              )}
            </div>

            {isLogin && (
              <div className="flex items-center gap-2 justify-end">
                <Label htmlFor="remember-me" className="text-sm cursor-pointer">
                  זכור אותי
                </Label>
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {isLogin ? "מתחבר..." : "נרשם..."}
                </>
              ) : isLogin ? (
                "התחבר"
              ) : (
                "הרשם"
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setDisplayName("");
                }}
                className="text-primary hover:underline"
                disabled={isLoading}
              >
                {isLogin
                  ? "אין לך חשבון? הירשם כאן"
                  : "כבר יש לך חשבון? התחבר כאן"}
              </button>
            </div>

            <div className="text-center">
              <Link to="/" className="text-sm text-muted-foreground hover:underline">
                חזרה לדף הבית
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
