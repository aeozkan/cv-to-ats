import { jsPDF } from "jspdf";

export function generateAtsPdf(text: string, filename = "resume-ats.pdf") {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 54; // 0.75 inch
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  let y = margin;
  const lineHeight = 14;

  const lines = text.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    const isHeader = /^[A-Z][A-Z0-9 &/\-]+$/.test(line.trim()) && line.trim().length > 2;

    if (isHeader) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(line.trim(), margin, y);
      y += lineHeight;
      // underline
      doc.setLineWidth(0.5);
      doc.line(margin, y - 10, pageWidth - margin, y - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      continue;
    }

    if (line.trim() === "") {
      y += lineHeight / 2;
      continue;
    }

    const wrapped = doc.splitTextToSize(line, maxWidth) as string[];
    for (const w of wrapped) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(w, margin, y);
      y += lineHeight;
    }
  }

  doc.save(filename);
}