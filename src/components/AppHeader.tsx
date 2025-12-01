import { Book } from "lucide-react";
import { SyncIndicator } from "@/components/SyncIndicator";
import { GlobalSearchTrigger } from "@/components/GlobalSearchTrigger";
import { UserMenu } from "@/components/UserMenu";
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load settings - not needed immediately
const Settings = lazy(() => import("@/components/Settings").then(m => ({ default: m.Settings })));

const SettingsSkeleton = () => <Skeleton className="h-9 w-9 rounded-md" />;

interface AppHeaderProps {
  isMobile: boolean;
  syncStatus: 'syncing' | 'synced' | 'error';
}

export const AppHeader = ({ isMobile, syncStatus }: AppHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="flex items-center gap-2 flex-1">
          <Book className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">חמישה חומשי תורה</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {!isMobile && <SyncIndicator status={syncStatus} />}
          <Suspense fallback={<SettingsSkeleton />}>
            <Settings />
          </Suspense>
          <GlobalSearchTrigger />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};
