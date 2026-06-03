import { PrismaClient } from "@prisma/client";

import { parseInstallmentScheduleFromText } from "../services/document-intelligence/extraction/installment-schedule.parser";

const p = new PrismaClient();

async function main() {
  const obs = await p.financialObligation.findMany({
    orderBy: { startDate: "asc" },
  });
  const evs = await p.financialEvent.findMany({
    where: { sourceDocumentId: { not: null } },
    orderBy: { startDate: "asc" },
  });
  console.log("=== OBLIGATIONS ===");
  for (const o of obs) {
    console.log(
      `${o.frequency}\t${o.amount}\t${o.startDate.toISOString().slice(0, 10)}\t${o.name}`,
    );
  }
  console.log("=== DOC-SOURCED EVENTS ===");
  for (const e of evs) {
    console.log(
      `${e.frequency}\t${e.amount}\t${e.startDate.toISOString().slice(0, 10)}\t${e.category}`,
    );
  }

  const d = await p.document.findFirst({
    where: { extractedText: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { filename: true, extractedText: true },
  });
  if (d?.extractedText) {
    console.log("=== LATEST DOC ===", d.filename, "len", d.extractedText.length);
    const parsed = parseInstallmentScheduleFromText(d.extractedText);
    console.log("=== PARSER ROWS ===", parsed.length);
    for (const row of parsed) {
      console.log(`${row.frequency}\t${row.amount}\t${row.startDate}`);
    }
    const idx = d.extractedText.search(/installment|payment|schedule|due/i);
    console.log("=== TEXT SNIPPET ===");
    console.log(d.extractedText.slice(Math.max(0, idx - 100), idx + 1200));
  }
}

main()
  .finally(() => p.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
