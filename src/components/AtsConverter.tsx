import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Download, FileUp, Languages, Loader2, Sparkles, MessageSquare } from "lucide-react";
import { extractTextFromFile } from "@/lib/extractText";
import { generateAtsPdf } from "@/lib/generatePdf";
import { supabase } from "@/integrations/supabase/client";
import { type Lang, t, detectLanguage } from "@/lib/i18n";
import { AssistantChat } from "@/components/AssistantChat";

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
  const [uiLang, setUiLang] = useState<Lang>("en");
  const [outputLang, setOutputLang] = useState<Lang>("en");
  const [extractedText, setExtractedText] = useState<string>("");
  const [sourceLang, setSourceLang] = useState<Lang | null>(null);

  const tr = useMemo(() => t(uiLang), [uiLang]);
  const needsTranslation = sourceLang !== null && sourceLang !== outputLang;

  async function handleConvert(forceTranslate = false) {
    if (!file) {
      toast({ title: tr.noFile, description: tr.noFileDesc });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      let rawText = extractedText;
      if (!rawText) {
        rawText = await extractTextFromFile(file);
        setExtractedText(rawText);
        const detected = detectLanguage(rawText);
        setSourceLang(detected);
      }
      if (!rawText || rawText.length < 30) {
        throw new Error(tr.extractError);
      }

      const translate = forceTranslate || (sourceLang !== null && sourceLang !== outputLang);

      const { data, error } = await supabase.functions.invoke("restructure-resume", {
        body: {
          rawText,
          targetRole: targetRole.trim() || undefined,
          outputLanguage: outputLang,
          translate,
        },
      });

      if (error) {
        const msg = (error as { message?: string }).message || "Conversion failed";
        if (msg.includes("429")) {
          toast({ title: tr.rateLimited, description: tr.rateLimitedDesc, variant: "destructive" });
        } else if (msg.includes("402")) {
          toast({ title: tr.creditsNeeded, description: tr.creditsNeededDesc, variant: "destructive" });
        } else {
          toast({ title: tr.error, description: msg, variant: "destructive" });
        }
        return;
      }

      const r = data as AtsResult;
      setResult(r);
      setEditedResume(r.ats_resume);
      toast({ title: tr.converted, description: `${tr.detectedRole}: ${r.detected_role}` });
    } catch (e) {
      toast({
        title: tr.failed,
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

  function onFileChange(f: File | null) {
    setFile(f);
    setExtractedText("");
    setSourceLang(null);
    setResult(null);
  }

  return (
    <div className="container mx-auto max-w-5xl space-y-6 py-10 px-4">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[260px]">
            <h1 className="text-3xl font-bold tracking-tight">{tr.title}</h1>
            <p className="text-muted-foreground">{tr.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <Select value={uiLang} onValueChange={(v) => setUiLang(v as Lang)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="tr">Türkçe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{tr.step1Title}</CardTitle>
          <CardDescription>{tr.step1Desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="file">{tr.fileLabel}</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                {tr.selected}: {file.name}
                {sourceLang && ` · ${sourceLang.toUpperCase()}`}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">{tr.targetRoleLabel}</Label>
            <Input
              id="role"
              placeholder={tr.targetRolePh}
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="outlang">{tr.languageLabel}</Label>
            <Select value={outputLang} onValueChange={(v) => setOutputLang(v as Lang)}>
              <SelectTrigger id="outlang" className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{tr.english}</SelectItem>
                <SelectItem value="tr">{tr.turkish}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleConvert(false)} disabled={loading || !file}>
              {loading ? <Loader2 className="animate-spin" /> : <FileUp />}
              {loading ? tr.converting : tr.convert}
            </Button>
            {needsTranslation && (
              <Button
                onClick={() => handleConvert(true)}
                disabled={loading || !file}
                variant="secondary"
              >
                <Languages />
                {outputLang === "en" ? "Translate & Optimize to English" : "Türkçeye Çevir ve Optimize Et"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> {tr.scoreTitle}
              </CardTitle>
              <CardDescription>
                {tr.scoreDescPrefix} <strong>{result.detected_role}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{tr.currentScore}</span>
                <span className="text-2xl font-bold">{result.ats_score}/100</span>
              </div>
              <Progress value={result.ats_score} />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{tr.missingTitle}</CardTitle>
                <CardDescription>{tr.missingDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.missing_keywords.map((k) => (
                    <Badge key={k.keyword} variant="secondary" title={k.reason}>
                      {k.keyword}
                    </Badge>
                  ))}
                  {result.missing_keywords.length === 0 && (
                    <p className="text-sm text-muted-foreground">{tr.noGaps}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{tr.tipsTitle}</CardTitle>
                <CardDescription>{tr.tipsDesc}</CardDescription>
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
                <CardTitle>{tr.resumeTitle}</CardTitle>
                <CardDescription>{tr.resumeDesc}</CardDescription>
              </div>
              <Button onClick={handleDownload} disabled={!editedResume}>
                <Download /> {tr.download}
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