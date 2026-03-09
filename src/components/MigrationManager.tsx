import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Database,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  FileText,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface MigrationEntry {
  name: string;
  sql: string;
  status: "pending" | "running" | "success" | "error" | "skipped";
  error?: string;
  timestamp?: string;
}

interface ExistingMigration {
  version: string;
  name: string;
  statements_count: number;
}

const KNOWN_MIGRATIONS: ExistingMigration[] = [
  { version: "20251201131314", name: "remix_migration_from_pg_dump", statements_count: 0 },
  { version: "20260218161423", name: "193a5251-5b1f-4cdc-931a-3d760828300a", statements_count: 0 },
  { version: "20260306000000", name: "rashi_commentary", statements_count: 0 },
  { version: "20260308000000", name: "commentaries_unified", statements_count: 0 },
];

const parseMigrationStatements = (sql: string): string[] => {
  // Split by semicolons but respect $$ blocks (function bodies)
  const statements: string[] = [];
  let current = "";
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "$" && sql[i + 1] === "$") {
      inDollarQuote = !inDollarQuote;
      current += "$$";
      i++;
      continue;
    }
    if (ch === ";" && !inDollarQuote) {
      const trimmed = current.trim();
      if (trimmed.length > 0) statements.push(trimmed);
      current = "";
      continue;
    }
    current += ch;
  }
  const last = current.trim();
  if (last.length > 0) statements.push(last);

  return statements;
};

const validateSQL = (sql: string): { valid: boolean; warnings: string[]; errors: string[] } => {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!sql.trim()) {
    errors.push("קובץ ריק — אין הצהרות SQL");
    return { valid: false, warnings, errors };
  }

  const lower = sql.toLowerCase();

  // Dangerous patterns
  if (lower.includes("drop database")) {
    errors.push("DROP DATABASE אסור");
  }
  if (lower.includes("alter database postgres")) {
    errors.push("ALTER DATABASE postgres אסור בסביבת Cloud");
  }

  // Reserved schemas
  const reservedSchemas = ["auth.", "storage.", "realtime.", "supabase_functions.", "vault."];
  for (const schema of reservedSchemas) {
    if (lower.includes(schema)) {
      warnings.push(`שימוש בסכמה שמורה: ${schema.replace(".", "")} — ייתכן שזה יגרום לבעיות`);
    }
  }

  // Destructive operations warning
  if (lower.includes("drop table")) {
    warnings.push("מכיל DROP TABLE — ודא שאתה יודע מה אתה עושה");
  }
  if (lower.includes("truncate")) {
    warnings.push("מכיל TRUNCATE — זה ימחק את כל הנתונים בטבלה");
  }

  const statements = parseMigrationStatements(sql);
  if (statements.length > 50) {
    warnings.push(`מכיל ${statements.length} הצהרות — מיגרציה גדולה`);
  }

  return { valid: errors.length === 0, warnings, errors };
};

export const MigrationManager = () => {
  const [migrations, setMigrations] = useState<MigrationEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedMigration, setExpandedMigration] = useState<string | null>(null);
  const [showExisting, setShowExisting] = useState(false);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (!file.name.endsWith(".sql")) {
        toast.error(`${file.name} — רק קבצי .sql נתמכים`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const sql = ev.target?.result as string;
        const validation = validateSQL(sql);

        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.errors.join(", ")}`);
          return;
        }

        if (validation.warnings.length > 0) {
          toast.warning(`${file.name}: ${validation.warnings.join("; ")}`);
        }

        setMigrations((prev) => {
          // Don't add duplicates
          if (prev.some((m) => m.name === file.name)) {
            toast.info(`${file.name} כבר נוסף`);
            return prev;
          }
          return [
            ...prev,
            {
              name: file.name,
              sql,
              status: "pending",
              timestamp: new Date().toLocaleTimeString("he-IL"),
            },
          ];
        });
      };
      reader.readAsText(file);
    });

    // Reset input
    e.target.value = "";
  }, []);

  const runMigration = useCallback(async (index: number) => {
    setMigrations((prev) =>
      prev.map((m, i) => (i === index ? { ...m, status: "running" as const, error: undefined } : m))
    );

    const migration = migrations[index];
    const statements = parseMigrationStatements(migration.sql);

    try {
      for (const stmt of statements) {
        const { error } = await supabase.rpc("exec_sql" as any, { query: stmt } as any);
        if (error) {
          // Try as direct query via edge function or fallback
          throw new Error(error.message);
        }
      }

      setMigrations((prev) =>
        prev.map((m, i) => (i === index ? { ...m, status: "success" as const } : m))
      );
      toast.success(`✅ ${migration.name} הושלם בהצלחה`);
    } catch (err: any) {
      const errorMsg = err?.message || "שגיאה לא ידועה";
      setMigrations((prev) =>
        prev.map((m, i) => (i === index ? { ...m, status: "error" as const, error: errorMsg } : m))
      );
      toast.error(`❌ ${migration.name}: ${errorMsg}`);
    }
  }, [migrations]);

  const runAllPending = useCallback(async () => {
    setIsRunning(true);
    const pendingIndices = migrations
      .map((m, i) => (m.status === "pending" || m.status === "error" ? i : -1))
      .filter((i) => i >= 0);

    for (const idx of pendingIndices) {
      await runMigration(idx);
    }
    setIsRunning(false);
  }, [migrations, runMigration]);

  const removeMigration = useCallback((index: number) => {
    setMigrations((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setMigrations([]);
  }, []);

  const statusIcon = (status: MigrationEntry["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "skipped":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const statusLabel = (status: MigrationEntry["status"]) => {
    switch (status) {
      case "pending": return "ממתין";
      case "running": return "רץ...";
      case "success": return "הצליח";
      case "error": return "שגיאה";
      case "skipped": return "דולג";
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Existing migrations */}
      <Collapsible open={showExisting} onOpenChange={setShowExisting}>
        <Card className="p-4">
          <CollapsibleTrigger className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {showExisting ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">מיגרציות קיימות</h3>
              <Database className="h-4 w-4 text-primary" />
              <Badge variant="secondary" className="text-xs">
                {KNOWN_MIGRATIONS.length}
              </Badge>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3 space-y-2">
            <Separator />
            {KNOWN_MIGRATIONS.map((m) => (
              <div
                key={m.version}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs"
              >
                <Badge variant="outline" className="text-[10px]">
                  {m.version}
                </Badge>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-mono text-xs">{m.name}</span>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Upload area */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {migrations.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground">
                נקה הכל
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">העלאת מיגרציות</h3>
            <Upload className="h-4 w-4 text-primary" />
          </div>
        </div>

        <Separator />

        <label className="flex flex-col items-center justify-center border-2 border-dashed border-accent/30 rounded-xl p-6 cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-all">
          <FileText className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm font-medium text-muted-foreground">
            לחץ לבחירת קבצי SQL
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            ניתן להעלות מספר קבצים בו-זמנית
          </span>
          <input
            type="file"
            accept=".sql"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </Card>

      {/* Migration queue */}
      {migrations.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              onClick={runAllPending}
              disabled={isRunning || !migrations.some((m) => m.status === "pending" || m.status === "error")}
              className="gap-1.5"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              הרץ הכל
            </Button>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">תור מיגרציות</h3>
              <Badge variant="secondary" className="text-xs">
                {migrations.filter((m) => m.status === "pending").length} ממתינים
              </Badge>
            </div>
          </div>

          <Separator />

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {migrations.map((m, idx) => (
                <Collapsible
                  key={m.name}
                  open={expandedMigration === m.name}
                  onOpenChange={(open) => setExpandedMigration(open ? m.name : null)}
                >
                  <div className="rounded-lg border bg-card">
                    <div className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMigration(idx);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        {m.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              runMigration(idx);
                            }}
                          >
                            <Play className="h-3 w-3" />
                            הרץ
                          </Button>
                        )}

                        {m.status === "error" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              runMigration(idx);
                            }}
                          >
                            <Play className="h-3 w-3" />
                            נסה שוב
                          </Button>
                        )}
                      </div>

                      <CollapsibleTrigger className="flex items-center gap-2 flex-1 justify-end">
                        <Badge
                          variant={m.status === "error" ? "destructive" : m.status === "success" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {statusLabel(m.status)}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          {statusIcon(m.status)}
                          <span className="text-sm font-mono truncate max-w-[180px]">
                            {m.name}
                          </span>
                        </div>
                      </CollapsibleTrigger>
                    </div>

                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-2">
                        <Separator />
                        {m.error && (
                          <div className="p-2 rounded bg-destructive/10 text-destructive text-xs font-mono text-right">
                            {m.error}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {parseMigrationStatements(m.sql).length} הצהרות
                          {m.timestamp && <span className="mr-2">• נוסף ב-{m.timestamp}</span>}
                        </div>
                        <ScrollArea className="max-h-[200px]">
                          <pre className="text-[10px] font-mono bg-muted/30 rounded p-2 whitespace-pre-wrap text-right overflow-x-auto" dir="ltr">
                            {m.sql.substring(0, 2000)}
                            {m.sql.length > 2000 && "\n\n... (קוצר)"}
                          </pre>
                        </ScrollArea>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground p-3 bg-muted/20 rounded-lg space-y-1">
        <p className="font-semibold">💡 טיפים:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>מיגרציות מורצות לפי סדר ההעלאה</li>
          <li>שגיאות מזוהות ומוצגות — ניתן לנסות שוב</li>
          <li>אין לשנות סכמות שמורות (auth, storage, realtime)</li>
          <li>השתמש ב-CREATE OR REPLACE למניעת כפילויות</li>
        </ul>
      </div>
    </div>
  );
};
