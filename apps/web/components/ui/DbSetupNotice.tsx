import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DbSetupNoticeProps {
  message: string;
}

export function DbSetupNotice({ message }: DbSetupNoticeProps) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader>
        <CardTitle className="text-base text-destructive">
          Database not ready
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>{message}</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            Start Postgres:{" "}
            <code className="text-xs">docker compose up -d</code> from the repo
            root
          </li>
          <li>
            Set{" "}
            <code className="text-xs">
              DATABASE_URL=postgresql://household:household@localhost:5433/household_finance
            </code>{" "}
            in <code className="text-xs">apps/web/.env</code>
          </li>
          <li>
            Run{" "}
            <code className="text-xs">cd apps/web && npm run db:push</code>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
