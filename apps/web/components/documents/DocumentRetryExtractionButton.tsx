"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { retryDocumentExtraction } from "@/lib/api/client";

interface DocumentRetryExtractionButtonProps {
  documentId: string;
}

export function DocumentRetryExtractionButton({
  documentId,
}: DocumentRetryExtractionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setLoading(true);
    setError(null);
    try {
      const result = await retryDocumentExtraction(documentId);
      if (result.document.extractionStatus === "FAILED") {
        setError(result.document.extractionError ?? "Extraction failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => void handleRetry()}
      >
        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        Retry extraction
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
