import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Book } from "lucide-react";

export const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

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
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="text-right"
                disabled={isLoading}
              />
              {!isLogin && (
                <p className="text-xs text-muted-foreground text-right">
                  לפחות 6 תווים
                </p>
              )}
            </div>
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
