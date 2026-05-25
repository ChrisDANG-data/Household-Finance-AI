import { EngineModuleLayout } from "@/components/EngineModuleLayout";
import { DocumentLibrary } from "@/components/documents/DocumentLibrary";
import { DocumentUploadPanel } from "@/components/documents/DocumentUploadPanel";
import { DbSetupNotice } from "@/components/ui/DbSetupNotice";
import { documentRepository } from "@/services/document-intelligence/document.repository";

export const dynamic = "force-dynamic";

export default async function DocumentsEnginePage() {
  let documents: Awaited<ReturnType<typeof documentRepository.list>> = [];
  let dbError: string | null = null;

  try {
    documents = await documentRepository.list();
  } catch (error) {
    dbError =
      error instanceof Error
        ? error.message
        : "Could not connect to the database.";
  }

  return (
    <EngineModuleLayout
      title="Document Intelligence"
      subtitle="Upload PDFs and images. Raw text is extracted and stored for later review and obligation linking."
    >
      {dbError ? <DbSetupNotice message={dbError} /> : null}
      <DocumentUploadPanel />
      {!dbError ? <DocumentLibrary documents={documents} /> : null}
    </EngineModuleLayout>
  );
}
