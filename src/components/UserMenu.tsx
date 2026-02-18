import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, CircleUser, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const UserMenu = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("התנתקת בהצלחה");
      navigate("/auth");
    } catch (error: any) {
      toast.error("שגיאה בניתוק");
    }
  };

  if (!user) {
    return (
      <Button
        variant="ghost"
        onClick={() => navigate("/auth")}
        className="gap-2 text-white hover:text-white hover:bg-white/10 flex-row-reverse"
      >
        <span>התחבר</span>
        <LogIn className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 text-white hover:text-white hover:bg-white/10 flex-row-reverse">
          <span>{user.email?.split("@")[0]}</span>
          <CircleUser className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-right">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold">החשבון שלי</span>
            <span className="text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")} className="gap-2 cursor-pointer">
          <UserCircle className="h-4 w-4" />
          <span>המערכת שלי</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
          <LogOut className="h-4 w-4" />
          <span>התנתק</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
