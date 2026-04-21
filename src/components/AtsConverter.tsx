import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Download, FileUp, Loader2, Sparkles } from "lucide-react";
import { extractTextFromFile } from "@/lib/extractText";
import { generateAtsPdf } from "@/lib/generatePdf";
import { supabase } from "@/integrations/supabase/client";

type Keyword = { keyword: string; reason: string };
type AtsResult = {
  ats_resume: string;
  detected_role: string;
  ats_score: number;
  missing_keywords: Keyword[];
  improvements: string[];
};

export function AtsConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AtsResult | null>(null);
  const [editedResume, setEditedResume] = useState("");

  async function handleConvert() {
    if (!file) {
      toast({ title: "No file", description: "Upload a PDF or DOCX resume first." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const rawText = await extractTextFromFile(file);
      if (!rawText || rawText.length < 30) {
        throw new Error("Could not extract enough text from the file. Try a different file.");
      }

      const { data, error } = await supabase.functions.invoke("restructure-resume", {
        body: { rawText, targetRole: targetRole.trim() || undefined },
      });

      if (error) {
        const msg = (error as { message?: string }).message || "Conversion failed";
        if (msg.includes("429")) {
          toast({ title: "Rate limited", description: "Please wait and try again.", variant: "destructive" });
        } else if (msg.includes("402")) {
          toast({ title: "Credits needed", description: "Add credits to your Lovable AI workspace.", variant: "destructive" });
        } else {
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
        return;
      }

      const r = data as AtsResult;
      setResult(r);
      setEditedResume(r.ats_resume);
      toast({ title: "Resume converted", description: `Detected role: ${r.detected_role}` });
    } catch (e) {
      toast({
        title: "Failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!editedResume) return;
    generateAtsPdf(editedResume, `${(result?.detected_role || "resume").replace(/\s+/g, "_")}_ATS.pdf`);
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-10 px-4">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">CV → ATS Converter</h1>
        <p className="text-muted-foreground">
          Upload your resume. We'll strip non-ATS elements, reorganize it into a standard ATS layout, and suggest missing
          keywords.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>1. Upload your resume</CardTitle>
          <CardDescription>PDF or DOCX. Text is extracted in your browser.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="file">Resume file</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Target role (optional)</Label>
            <Input
              id="role"
              placeholder="e.g. Senior Frontend Engineer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          <Button onClick={handleConvert} disabled={loading || !file} className="w-full sm:w-auto">
            {loading ? <Loader2 className="animate-spin" /> : <FileUp />}
            {loading ? "Converting..." : "Convert to ATS Format"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> ATS Match Score
              </CardTitle>
              <CardDescription>
                Estimated for role: <strong>{result.detected_role}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current score</span>
                <span className="text-2xl font-bold">{result.ats_score}/100</span>
              </div>
              <Progress value={result.ats_score} />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Missing Keywords</CardTitle>
                <CardDescription>Add these to boost ATS match.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.map((k) => (
                    <Badge key={k.keyword} variant="secondary" title={k.reason}>
                      {k.keyword}
                    </Badge>
                  ))}
                  {result.missing_keywords.length === 0 && (
                    <p className="text-sm text-muted-foreground">No major keyword gaps detected.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Improvement Tips</CardTitle>
                <CardDescription>Quick wins for ATS compatibility.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {result.improvements.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>ATS-Optimized Resume</CardTitle>
                <CardDescription>Edit if needed, then download as ATS-friendly PDF.</CardDescription>
              </div>
              <Button onClick={handleDownload} disabled={!editedResume}>
                <Download /> Download PDF
              </Button>
            </CardHeader>
            <CardContent>
              <Textarea
                value={editedResume}
                onChange={(e) => setEditedResume(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}