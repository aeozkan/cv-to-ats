import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, User, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { type Lang, t } from "@/lib/i18n";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  currentResume: string;
  outputLang: Lang;
  uiLang: Lang;
  targetRole?: string;
  onResumeUpdate: (next: string) => void;
};

export function AssistantChat({ currentResume, outputLang, uiLang, targetRole, onResumeUpdate }: Props) {
  const tr = t(uiLang);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [tr.qp1, tr.qp2, tr.qp3, tr.qp4];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(text: string) {
    const instruction = text.trim();
    if (!instruction || loading || !currentResume) return;
    const nextHistory: ChatMessage[] = [...messages, { role: "user", content: instruction }];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("edit-resume", {
        body: {
          currentResume,
          instruction,
          history: messages,
          outputLanguage: outputLang,
          targetRole,
        },
      });
      if (error) {
        const msg = (error as { message?: string }).message || "Failed";
        if (msg.includes("429")) {
          toast({ title: tr.rateLimited, description: tr.rateLimitedDesc, variant: "destructive" });
        } else if (msg.includes("402")) {
          toast({ title: tr.creditsNeeded, description: tr.creditsNeededDesc, variant: "destructive" });
        } else {
          toast({ title: tr.error, description: msg, variant: "destructive" });
        }
        return;
      }
      const r = data as { updated_resume: string; assistant_message: string };
      if (r?.updated_resume) {
        onResumeUpdate(r.updated_resume);
        setMessages([...nextHistory, { role: "assistant", content: r.assistant_message || tr.updated }]);
        toast({ title: tr.updated });
      } else {
        toast({ title: tr.error, description: "Empty response", variant: "destructive" });
      }
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

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">{tr.assistantTitle}</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{tr.assistantDesc}</p>
      </div>

      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="space-y-4 p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{tr.assistantEmpty}</p>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tr.quickPrompts}
                </p>
                <div className="flex flex-col gap-2">
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={loading}
                      className="rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr.thinking}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={tr.assistantPlaceholder}
            className="min-h-[60px] resize-none text-sm"
            disabled={loading || !currentResume}
          />
          <Button
            onClick={() => send(input)}
            disabled={loading || !input.trim() || !currentResume}
            size="icon"
            className="h-auto"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </div>
      </div>
    </div>
  );
}