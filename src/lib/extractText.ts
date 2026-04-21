import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
// Use the worker bundled by Vite
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    return extractFromPdf(file);
  }
  if (name.endsWith(".docx") || file.type.includes("officedocument.wordprocessingml")) {
    return extractFromDocx(file);
  }
  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported. Please save as .docx or .pdf.");
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return await file.text();
  }
  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT.");
}

async function extractFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => ("str" in item ? (item as { str: string }).str : ""));
    fullText += strings.join(" ") + "\n";
  }
  return fullText.trim();
}

async function extractFromDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}