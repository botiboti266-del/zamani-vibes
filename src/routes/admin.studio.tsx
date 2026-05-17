import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Mic, Square, Pause, Play, Upload, Trash2, Loader2, Sparkles, Music4 } from "lucide-react";
import { aiTranscribe } from "@/lib/ai.functions";

export const Route = createFileRoute("/admin/studio")({
  component: Studio,
});

function Studio() {
  const { user } = useAuth();
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "paused" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const tickRef = useRef<number | null>(null);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
  }, []);

  const drawWave = (stream: MediaStream) => {
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    src.connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    const canvas = canvasRef.current!;
    const c = canvas.getContext("2d")!;
    const loop = () => {
      an.getByteFrequencyData(buf);
      c.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width / buf.length;
      for (let i = 0; i < buf.length; i++) {
        const h = (buf[i] / 255) * canvas.height;
        const grad = c.createLinearGradient(0, canvas.height - h, 0, canvas.height);
        grad.addColorStop(0, "#f5c451");
        grad.addColorStop(1, "#b8860b");
        c.fillStyle = grad;
        c.fillRect(i * w, canvas.height - h, w - 1, h);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      drawWave(stream);
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState("done");
      };
      rec.start(100);
      recRef.current = rec;
      setState("recording");
      setSeconds(0);
      tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e: any) { toast.error(e?.message ?? "Mic denied"); }
  };
  const pause = () => { recRef.current?.pause(); setState("paused"); if (tickRef.current) window.clearInterval(tickRef.current); };
  const resume = () => { recRef.current?.resume(); setState("recording"); tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000); };
  const stop = () => {
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
  };
  const reset = () => {
    setBlob(null); setUrl(null); setState("idle"); setSeconds(0); setNotes("");
  };

  const upload = async () => {
    if (!blob || !user) return;
    setUploading(true);
    const ext = blob.type.includes("mp4") ? "m4a" : "webm";
    const path = `${user.id}/studio-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("podcast-audio").upload(path, blob, { contentType: blob.type });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("podcast-audio").getPublicUrl(path);
    const { data: row, error: insErr } = await supabase.from("podcasts").insert({
      title: `Studio recording ${new Date().toLocaleString()}`,
      slug: `studio-${Date.now()}`,
      audio_url: pub.publicUrl,
      duration: seconds,
      status: "draft",
      author_id: user.id,
      show_notes: notes,
    }).select().single();
    setUploading(false);
    if (insErr) toast.error(insErr.message);
    else { toast.success("Saved as draft"); window.location.href = `/admin/podcasts/${row.id}`; }
  };

  const aiNotes = async () => {
    setAiBusy(true);
    try {
      const r = await aiTranscribe({ data: { description: notes || "Old-school East African podcast recorded in studio." } });
      setNotes(r.notes);
    } catch (e: any) { toast.error(e?.message ?? "AI failed"); }
    finally { setAiBusy(false); }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="space-y-6 animate-fade-up">
      <div><h1 className="font-display text-3xl flex items-center gap-2"><Music4 className="h-7 w-7" /> Recording studio</h1>
        <p className="text-sm text-muted-foreground">Record directly in the browser. No copyrighted music — just sauti.</p></div>

      <div className="glass rounded-3xl p-6 space-y-4 shadow-elegant">
        <canvas ref={canvasRef} width={800} height={120} className="w-full h-28 rounded-xl bg-secondary/40" />
        <div className="text-center font-display text-4xl tabular-nums">{mm}:{ss}</div>
        <div className="flex justify-center gap-3 flex-wrap">
          {state === "idle" && (
            <button onClick={start} className="px-6 py-3 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine inline-flex items-center gap-2"><Mic className="h-5 w-5" /> Start recording</button>
          )}
          {state === "recording" && (
            <>
              <button onClick={pause} className="px-5 py-3 rounded-full bg-secondary inline-flex items-center gap-2"><Pause className="h-4 w-4" /> Pause</button>
              <button onClick={stop} className="px-5 py-3 rounded-full bg-destructive text-destructive-foreground inline-flex items-center gap-2"><Square className="h-4 w-4" /> Stop</button>
            </>
          )}
          {state === "paused" && (
            <>
              <button onClick={resume} className="px-5 py-3 rounded-full bg-gradient-gold text-primary-foreground inline-flex items-center gap-2"><Play className="h-4 w-4" /> Resume</button>
              <button onClick={stop} className="px-5 py-3 rounded-full bg-destructive text-destructive-foreground inline-flex items-center gap-2"><Square className="h-4 w-4" /> Stop</button>
            </>
          )}
          {state === "done" && url && (
            <div className="w-full space-y-4">
              <audio src={url} controls className="w-full" />
              <textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Show notes / topics..." className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm" />
              <div className="flex flex-wrap gap-2 justify-center">
                <button onClick={aiNotes} disabled={aiBusy} className="px-5 py-2.5 rounded-full bg-secondary inline-flex items-center gap-2 text-sm">{aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI show notes</button>
                <button onClick={upload} disabled={uploading} className="px-5 py-2.5 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine inline-flex items-center gap-2">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Save as draft</button>
                <button onClick={reset} className="px-5 py-2.5 rounded-full bg-secondary inline-flex items-center gap-2 text-sm"><Trash2 className="h-4 w-4" /> Discard</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
