import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface EngineModuleCardProps {
  name: string;
  href: string;
  description: string;
  apiPath: string;
}

export function EngineModuleCard({
  name,
  href,
  description,
  apiPath,
}: EngineModuleCardProps) {
  return (
    <Link
      href={href}
      role="button"
      aria-label={`Explore ${name} engine module`}
      className={cn(
        "block rounded-xl outline-none transition-transform duration-200",
        "cursor-pointer hover:scale-105",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <Card
        className={cn(
          "h-full shadow-sm transition-shadow duration-200",
          "hover:shadow-md",
        )}
      >
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase">
              Engine module
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Click to explore
            </Badge>
          </div>
          <CardTitle>{name}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-xs text-muted-foreground">{apiPath}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
