import type { ApiResponse } from "@/types/api";
import type { SerializedDocument, SerializedObligation } from "@/lib/serializers";
import type { MonthlyObligationSummary } from "@/services/financial-state/obligation-summary";

async function parseApi<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new Error(body.error.message);
  }
  return body.data;
}

export async function fetchDocuments(): Promise<SerializedDocument[]> {
  const data = await parseApi<{ documents: SerializedDocument[] }>(
    await fetch("/api/documents/upload", { cache: "no-store" }),
  );
  return data.documents;
}

export async function uploadDocument(file: File): Promise<SerializedDocument> {
  const formData = new FormData();
  formData.append("file", file);
  const data = await parseApi<{ document: SerializedDocument }>(
    await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    }),
  );
  return data.document;
}

export async function fetchObligations(month: string): Promise<{
  obligations: SerializedObligation[];
  summary: MonthlyObligationSummary;
}> {
  return parseApi(
    await fetch(`/api/obligations?month=${encodeURIComponent(month)}`, {
      cache: "no-store",
    }),
  );
}

export async function createObligation(
  input: Record<string, unknown>,
): Promise<SerializedObligation> {
  const data = await parseApi<{ obligation: SerializedObligation }>(
    await fetch("/api/obligations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return data.obligation;
}

export async function updateObligation(
  id: string,
  input: Record<string, unknown>,
): Promise<SerializedObligation> {
  const data = await parseApi<{ obligation: SerializedObligation }>(
    await fetch(`/api/obligations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
  return data.obligation;
}

export async function deleteObligation(id: string): Promise<void> {
  await parseApi(await fetch(`/api/obligations/${id}`, { method: "DELETE" }));
}
