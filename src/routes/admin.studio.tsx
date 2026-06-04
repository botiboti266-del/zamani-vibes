import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Mic, Square, Pause, Play, Upload, Trash2, Loader2, Sparkles, Music4,
  Volume2, Music2, Headphones, Radio, Save, Plus, Download, Sliders, Scissors, Zap,
} from "lucide-react";
import { aiTranscribe } from "@/lib/ai.functions";

export const Route = createFileRoute("/admin/studio")({ component: Studio });

interface Track { id: string; name: string; url: string }
interface FxPad { id: string; name: string; url: string }

// 8-band EQ frequencies (Hz)
const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000];

function Studio() {
  const { user } = useAuth();

  // Recording state
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // Audio context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const micGainRef = useRef<GainNode | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const fxGainRef = useRef<GainNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const noiseHpfRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const echoDelayRef = useRef<DelayNode | null>(null);
  const echoFeedbackRef = useRef<GainNode | null>(null);
  const echoWetRef = useRef<GainNode | null>(null);
  const echoLpfRef = useRef<BiquadFilterNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const musicAnalyserRef = useRef<AnalyserNode | null>(null);
  const musicElRef = useRef<HTMLAudioElement | null>(null);
  const musicSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const fxSourcesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map());
  const duckingRafRef = useRef<number | null>(null);

  const [state, setState] = useState<"idle" | "recording" | "paused" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");

  // Mixer
  const [micVolume, setMicVolume] = useState(1);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [fxVolume, setFxVolume] = useState(0.8);
  const [duckingEnabled, setDuckingEnabled] = useState(true);
  const [duckedLevel, setDuckedLevel] = useState(0.1);
  const [fadeInSec, setFadeInSec] = useState(2);
  const [fadeOutSec, setFadeOutSec] = useState(3);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [musicLevel, setMusicLevel] = useState(0);

  // EQ gains (-12 to +12 dB)
  const [eqGains, setEqGains] = useState<number[]>(() => EQ_BANDS.map(() => 0));

  // Noise filter + echo
  const [noiseFilterEnabled, setNoiseFilterEnabled] = useState(true);
  const [noiseHpfHz, setNoiseHpfHz] = useState(85);
  const [compressorAmount, setCompressorAmount] = useState(0.6); // 0..1
  const [echoEnabled, setEchoEnabled] = useState(false);
  const [echoDelayMs, setEchoDelayMs] = useState(220);
  const [echoFeedback, setEchoFeedback] = useState(0.3);
  const [echoMix, setEchoMix] = useState(0.25);
  const [echoDamping, setEchoDamping] = useState(4500);
  const [micPeak, setMicPeak] = useState(0);
  const [musicPeak, setMusicPeak] = useState(0);
  const [micClip, setMicClip] = useState(false);
  const [musicClip, setMusicClip] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presets, setPresets] = useState<Record<string, any>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(`syz-studio-presets`) || "{}"); } catch { return {}; }
  });

  // Trim
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);

  // Tracks library
  const tracks = useQuery({
    queryKey: ["bg-tracks"],
    queryFn: async () => {
      const { data } = await supabase.storage.from("background-music").list(user?.id ?? "", { sortBy: { column: "created_at", order: "desc" } });
      if (!data) return [] as Track[];
      return Promise.all(data.filter((f) => f.name && !f.name.endsWith("/")).map(async (f) => {
        const path = `${user!.id}/${f.name}`;
        const { data: signed } = await supabase.storage.from("background-music").createSignedUrl(path, 60 * 60);
        return { id: path, name: f.name, url: signed?.signedUrl ?? "" } as Track;
      }));
    },
    enabled: !!user,
  });

  // FX pads library
  const fxPads = useQuery({
    queryKey: ["fx-pads"],
    queryFn: async () => {
      const { data } = await supabase.storage.from("fx-sounds").list(user?.id ?? "", { sortBy: { column: "created_at", order: "desc" } });
      if (!data) return [] as FxPad[];
      return Promise.all(data.filter((f) => f.name && !f.name.endsWith("/")).map(async (f) => {
        const path = `${user!.id}/${f.name}`;
        const { data: signed } = await supabase.storage.from("fx-sounds").createSignedUrl(path, 60 * 60);
        return { id: path, name: f.name.replace(/\.[^.]+$/, ""), url: signed?.signedUrl ?? "" } as FxPad;
      }));
    },
    enabled: !!user,
  });

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (duckingRafRef.current) cancelAnimationFrame(duckingRafRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
    audioCtxRef.current?.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (micGainRef.current && audioCtxRef.current) {
      micGainRef.current.gain.setTargetAtTime(micVolume, audioCtxRef.current.currentTime, 0.05);
    }
  }, [micVolume]);
  useEffect(() => {
    if (musicGainRef.current && audioCtxRef.current && !duckingEnabled) {
      musicGainRef.current.gain.setTargetAtTime(musicVolume, audioCtxRef.current.currentTime, 0.05);
    }
  }, [musicVolume, duckingEnabled]);
  useEffect(() => {
    if (fxGainRef.current && audioCtxRef.current) {
      fxGainRef.current.gain.setTargetAtTime(fxVolume, audioCtxRef.current.currentTime, 0.05);
    }
  }, [fxVolume]);
  // Apply EQ changes live
  useEffect(() => {
    if (!audioCtxRef.current || eqFiltersRef.current.length === 0) return;
    eqGains.forEach((g, i) => {
      eqFiltersRef.current[i]?.gain.setTargetAtTime(g, audioCtxRef.current!.currentTime, 0.05);
    });
  }, [eqGains]);

  // Live-apply noise filter & echo settings
  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (noiseHpfRef.current) {
      noiseHpfRef.current.frequency.setTargetAtTime(noiseFilterEnabled ? noiseHpfHz : 20, ctx.currentTime, 0.05);
    }
    if (compressorRef.current) {
      const amt = noiseFilterEnabled ? compressorAmount : 0;
      compressorRef.current.threshold.setTargetAtTime(-18 - amt * 18, ctx.currentTime, 0.05);
      compressorRef.current.ratio.setTargetAtTime(2 + amt * 8, ctx.currentTime, 0.05);
    }
  }, [noiseFilterEnabled, noiseHpfHz, compressorAmount]);

  useEffect(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (echoDelayRef.current) echoDelayRef.current.delayTime.setTargetAtTime(Math.max(0.01, echoDelayMs / 1000), ctx.currentTime, 0.05);
    if (echoFeedbackRef.current) echoFeedbackRef.current.gain.setTargetAtTime(echoEnabled ? echoFeedback : 0, ctx.currentTime, 0.05);
    if (echoWetRef.current) echoWetRef.current.gain.setTargetAtTime(echoEnabled ? echoMix : 0, ctx.currentTime, 0.05);
    if (echoLpfRef.current) echoLpfRef.current.frequency.setTargetAtTime(echoDamping, ctx.currentTime, 0.05);
  }, [echoEnabled, echoDelayMs, echoFeedback, echoMix, echoDamping]);

  const drawWave = () => {
    const canvas = canvasRef.current!;
    const c = canvas.getContext("2d")!;
    const micAn = micAnalyserRef.current;
    const musicAn = musicAnalyserRef.current;
    if (!micAn) return;
    const micBuf = new Uint8Array(micAn.frequencyBinCount);
    const musicBuf = musicAn ? new Uint8Array(musicAn.frequencyBinCount) : null;
    let mpHold = 0, muHold = 0;
    const loop = () => {
      micAn.getByteFrequencyData(micBuf);
      if (musicAn && musicBuf) musicAn.getByteFrequencyData(musicBuf);
      const W = canvas.width, H = canvas.height;
      c.clearRect(0, 0, W, H);
      const w = W / micBuf.length;
      let micSum = 0, micMax = 0;
      for (let i = 0; i < micBuf.length; i++) {
        const v = micBuf[i];
        if (v > micMax) micMax = v;
        const h = (v / 255) * H * 0.9;
        micSum += v;
        const grad = c.createLinearGradient(0, H - h, 0, H);
        grad.addColorStop(0, "#f5c451");
        grad.addColorStop(1, "#b8860b");
        c.fillStyle = grad;
        c.fillRect(i * w, H - h, w - 1, h);
      }
      const micPk = micMax / 255;
      mpHold = Math.max(micPk, mpHold * 0.92);
      setMicLevel(micSum / micBuf.length / 255);
      setMicPeak(mpHold);
      setMicClip(micPk > 0.97);
      if (musicBuf) {
        let musicSum = 0, musicMax = 0;
        for (let i = 0; i < musicBuf.length; i++) {
          const v = musicBuf[i];
          if (v > musicMax) musicMax = v;
          const h = (v / 255) * H * 0.5;
          musicSum += v;
          c.fillStyle = "rgba(96, 165, 250, 0.35)";
          c.fillRect(i * w, H - h, w - 1, h);
        }
        const musicPk = musicMax / 255;
        muHold = Math.max(musicPk, muHold * 0.92);
        setMusicLevel(musicSum / musicBuf.length / 255);
        setMusicPeak(muHold);
        setMusicClip(musicPk > 0.97);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const setupContext = async (micStream: MediaStream) => {
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const dest = ctx.createMediaStreamDestination();
    destRef.current = dest;

    // mic → EQ chain → noise HPF → compressor → (echo wet ⨁ dry) → gain → analyser → dest
    const micSrc = ctx.createMediaStreamSource(micStream);
    const filters: BiquadFilterNode[] = EQ_BANDS.map((freq, i) => {
      const f = ctx.createBiquadFilter();
      f.type = i === 0 ? "lowshelf" : i === EQ_BANDS.length - 1 ? "highshelf" : "peaking";
      f.frequency.value = freq;
      f.Q.value = 1.1;
      f.gain.value = eqGains[i] ?? 0;
      return f;
    });
    eqFiltersRef.current = filters;
    let node: AudioNode = micSrc;
    for (const f of filters) { node.connect(f); node = f; }

    // Noise filter: high-pass + dynamics compressor (tames hum, hiss, plosives)
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = noiseFilterEnabled ? noiseHpfHz : 20;
    hpf.Q.value = 0.7;
    noiseHpfRef.current = hpf;
    node.connect(hpf);
    node = hpf;

    const comp = ctx.createDynamicsCompressor();
    const amt = noiseFilterEnabled ? compressorAmount : 0;
    comp.threshold.value = -18 - amt * 18; // -18..-36 dB
    comp.knee.value = 24;
    comp.ratio.value = 2 + amt * 8;        // 2:1..10:1
    comp.attack.value = 0.005;
    comp.release.value = 0.18;
    compressorRef.current = comp;
    node.connect(comp);
    node = comp;

    // Echo: feedback delay with damping lowpass in the loop, blended into the mic bus.
    const echoIn = ctx.createGain();
    echoIn.gain.value = 1;
    const delay = ctx.createDelay(2.0);
    delay.delayTime.value = Math.max(0.01, echoDelayMs / 1000);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = echoDamping;
    const feedback = ctx.createGain();
    feedback.gain.value = echoEnabled ? echoFeedback : 0;
    const wet = ctx.createGain();
    wet.gain.value = echoEnabled ? echoMix : 0;
    node.connect(echoIn);
    echoIn.connect(delay);
    delay.connect(lpf);
    lpf.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    echoDelayRef.current = delay;
    echoFeedbackRef.current = feedback;
    echoWetRef.current = wet;
    echoLpfRef.current = lpf;

    const micGain = ctx.createGain();
    micGain.gain.value = micVolume;
    const micAn = ctx.createAnalyser();
    micAn.fftSize = 256;
    node.connect(micGain);       // dry path
    wet.connect(micGain);        // echo wet path
    micGain.connect(micAn);
    micGain.connect(dest);
    micGainRef.current = micGain;
    micAnalyserRef.current = micAn;

    // music
    if (musicElRef.current && !musicSourceRef.current) {
      const musicSrc = ctx.createMediaElementSource(musicElRef.current);
      const musicGain = ctx.createGain();
      musicGain.gain.value = 0;
      const musicAn = ctx.createAnalyser();
      musicAn.fftSize = 256;
      musicSrc.connect(musicGain);
      musicGain.connect(musicAn);
      musicGain.connect(dest);
      musicGain.connect(ctx.destination);
      musicGainRef.current = musicGain;
      musicAnalyserRef.current = musicAn;
      musicSourceRef.current = musicSrc;
    }

    // fx master gain (each pad source connects here)
    const fxGain = ctx.createGain();
    fxGain.gain.value = fxVolume;
    fxGain.connect(dest);
    fxGain.connect(ctx.destination);
    fxGainRef.current = fxGain;

    if (duckingEnabled && musicGainRef.current) runDucking();
    drawWave();
  };

  const runDucking = () => {
    const loop = () => {
      if (!audioCtxRef.current || !musicGainRef.current || !micAnalyserRef.current) return;
      const buf = new Uint8Array(micAnalyserRef.current.frequencyBinCount);
      micAnalyserRef.current.getByteFrequencyData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i];
      const lvl = sum / buf.length / 255;
      const speaking = lvl > 0.08;
      const target = speaking ? Math.min(duckedLevel, musicVolume) : musicVolume;
      musicGainRef.current.gain.setTargetAtTime(target, audioCtxRef.current.currentTime, 0.15);
      duckingRafRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const fadeMusic = (from: number, to: number, durationSec: number) => {
    if (!musicGainRef.current || !audioCtxRef.current) return;
    const now = audioCtxRef.current.currentTime;
    musicGainRef.current.gain.cancelScheduledValues(now);
    musicGainRef.current.gain.setValueAtTime(from, now);
    musicGainRef.current.gain.linearRampToValueAtTime(to, now + Math.max(0.01, durationSec));
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: noiseFilterEnabled,
          autoGainControl: true,
        } as MediaTrackConstraints,
      });
      streamRef.current = stream;
      await setupContext(stream);

      if (selectedTrack && musicElRef.current) {
        try {
          musicElRef.current.currentTime = 0;
          await musicElRef.current.play();
          setMusicPlaying(true);
          fadeMusic(0, musicVolume, fadeInSec);
        } catch { /* ignore */ }
      }

      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const rec = new MediaRecorder(destRef.current!.stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState("done");
        // initialize trim to full
        try {
          const ab = await b.arrayBuffer();
          const tmpCtx = new AudioContext();
          const dec = await tmpCtx.decodeAudioData(ab.slice(0));
          setTrimStart(0);
          setTrimEnd(dec.duration);
          tmpCtx.close();
        } catch { /* ignore */ }
      };
      rec.start(100);
      recRef.current = rec;
      setState("recording");
      setSeconds(0);
      tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e: any) { toast.error(e?.message ?? "Mic denied"); }
  };

  const pause = () => {
    recRef.current?.pause();
    setState("paused");
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (musicElRef.current) musicElRef.current.pause();
  };
  const resume = () => {
    recRef.current?.resume();
    setState("recording");
    tickRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    if (musicElRef.current && selectedTrack) musicElRef.current.play().catch(() => {});
  };
  const stop = async () => {
    if (musicGainRef.current && musicPlaying) {
      fadeMusic(musicGainRef.current.gain.value, 0, fadeOutSec);
      await new Promise((r) => setTimeout(r, fadeOutSec * 1000));
      musicElRef.current?.pause();
      setMusicPlaying(false);
    }
    recRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (duckingRafRef.current) cancelAnimationFrame(duckingRafRef.current);
    if (tickRef.current) window.clearInterval(tickRef.current);
  };
  const reset = () => {
    setBlob(null); setUrl(null); setState("idle"); setSeconds(0); setNotes(""); setTitle("");
    musicSourceRef.current = null;
    musicGainRef.current = null;
    fxSourcesRef.current.clear();
    fxGainRef.current = null;
    eqFiltersRef.current = [];
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  // Trigger an FX pad — routes through fxGain so it's mixed into the recording.
  const triggerFx = async (pad: FxPad) => {
    try {
      const el = new Audio(pad.url);
      el.crossOrigin = "anonymous";
      // Only route through ctx if we're recording, otherwise just play locally.
      if (audioCtxRef.current && fxGainRef.current) {
        try {
          const src = audioCtxRef.current.createMediaElementSource(el);
          src.connect(fxGainRef.current);
        } catch { /* fallback to direct */ }
      }
      await el.play();
    } catch (e: any) { toast.error(e?.message ?? "FX play failed"); }
  };

  // Trim recording to [trimStart, trimEnd] and re-encode as WAV.
  const applyTrim = async () => {
    if (!blob) return;
    setTrimming(true);
    try {
      const ab = await blob.arrayBuffer();
      const ctx = new AudioContext();
      const dec = await ctx.decodeAudioData(ab.slice(0));
      const s = Math.max(0, Math.min(trimStart, dec.duration));
      const e = Math.max(s + 0.05, Math.min(trimEnd, dec.duration));
      const sampleRate = dec.sampleRate;
      const startSample = Math.floor(s * sampleRate);
      const endSample = Math.floor(e * sampleRate);
      const length = endSample - startSample;
      const out = ctx.createBuffer(dec.numberOfChannels, length, sampleRate);
      for (let ch = 0; ch < dec.numberOfChannels; ch++) {
        out.getChannelData(ch).set(dec.getChannelData(ch).subarray(startSample, endSample));
      }
      const wav = audioBufferToWav(out);
      const wb = new Blob([wav], { type: "audio/wav" });
      setBlob(wb);
      setUrl(URL.createObjectURL(wb));
      setSeconds(Math.round(e - s));
      setTrimStart(0);
      setTrimEnd(e - s);
      ctx.close();
      toast.success("Trimmed");
    } catch (err: any) { toast.error(err?.message ?? "Trim failed"); }
    finally { setTrimming(false); }
  };

  const exportWav = async () => {
    if (!blob) return;
    try {
      const ab = await blob.arrayBuffer();
      const ctx = new AudioContext();
      const dec = await ctx.decodeAudioData(ab.slice(0));
      const wav = audioBufferToWav(dec);
      ctx.close();
      const wb = new Blob([wav], { type: "audio/wav" });
      const u = URL.createObjectURL(wb);
      const a = document.createElement("a");
      a.href = u; a.download = `recording-${Date.now()}.wav`; a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
      toast.success("WAV downloaded");
    } catch (e: any) { toast.error(e?.message ?? "Export failed"); }
  };

  const applyNoisePreset = (name: "studio" | "street" | "hum") => {
    setNoiseFilterEnabled(true);
    if (name === "studio") { setNoiseHpfHz(85); setCompressorAmount(0.55); }
    if (name === "street") { setNoiseHpfHz(140); setCompressorAmount(0.8); }
    if (name === "hum") { setNoiseHpfHz(110); setCompressorAmount(0.35); }
    toast.success(`Preset applied: ${name === "studio" ? "Studio Voice" : name === "street" ? "Street Calm" : "Reduce Hum"}`);
  };

  const saveMixerPreset = () => {
    const n = presetName.trim();
    if (!n) { toast.error("Name required"); return; }
    const data = {
      micVolume, musicVolume, fxVolume, duckingEnabled, duckedLevel, fadeInSec, fadeOutSec,
      eqGains, noiseFilterEnabled, noiseHpfHz, compressorAmount,
      echoEnabled, echoDelayMs, echoFeedback, echoMix, echoDamping,
    };
    const next = { ...presets, [n]: data };
    setPresets(next);
    try { localStorage.setItem("syz-studio-presets", JSON.stringify(next)); } catch {}
    setPresetName("");
    toast.success(`Preset "${n}" saved`);
  };
  const loadMixerPreset = (name: string) => {
    const p = presets[name]; if (!p) return;
    setMicVolume(p.micVolume ?? 1); setMusicVolume(p.musicVolume ?? 0.4); setFxVolume(p.fxVolume ?? 0.8);
    setDuckingEnabled(p.duckingEnabled ?? true); setDuckedLevel(p.duckedLevel ?? 0.1);
    setFadeInSec(p.fadeInSec ?? 2); setFadeOutSec(p.fadeOutSec ?? 3);
    setEqGains(p.eqGains ?? EQ_BANDS.map(() => 0));
    setNoiseFilterEnabled(p.noiseFilterEnabled ?? true); setNoiseHpfHz(p.noiseHpfHz ?? 85); setCompressorAmount(p.compressorAmount ?? 0.6);
    setEchoEnabled(p.echoEnabled ?? false); setEchoDelayMs(p.echoDelayMs ?? 220); setEchoFeedback(p.echoFeedback ?? 0.3); setEchoMix(p.echoMix ?? 0.25); setEchoDamping(p.echoDamping ?? 4500);
    toast.success(`Loaded "${name}"`);
  };
  const deleteMixerPreset = (name: string) => {
    const next = { ...presets }; delete next[name];
    setPresets(next);
    try { localStorage.setItem("syz-studio-presets", JSON.stringify(next)); } catch {}
  };

  const upload = async () => {
    if (!blob || !user) return;
    setUploading(true);
    const ext = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "m4a" : "webm";
    const path = `${user.id}/studio-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("podcast-audio").upload(path, blob, { contentType: blob.type });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("podcast-audio").getPublicUrl(path);
    const slug = `studio-${Date.now()}`;
    const { data: row, error: insErr } = await supabase.from("podcasts").insert({
      title: title || `Studio recording ${new Date().toLocaleString()}`,
      slug, audio_url: pub.publicUrl, duration: seconds, status: "draft", author_id: user.id, show_notes: notes,
    }).select().single();
    setUploading(false);
    if (insErr) toast.error(insErr.message);
    else { toast.success("Saved as draft"); window.location.href = `/admin/podcasts/${row.id}`; }
  };

  const aiNotes = async () => {
    setAiBusy(true);
    try {
      const r = await aiTranscribe({ data: { description: notes || title || "Old-school East African podcast recorded in studio." } });
      setNotes(r.notes);
    } catch (e: any) { toast.error(e?.message ?? "AI failed"); }
    finally { setAiBusy(false); }
  };

  const uploadTrack = async (file: File) => {
    if (!user) return;
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error } = await supabase.storage.from("background-music").upload(path, file, { contentType: file.type });
    if (error) { toast.error(error.message); return; }
    toast.success("Track uploaded"); tracks.refetch();
  };
  const uploadTracks = async (files: FileList) => {
    for (const f of Array.from(files)) await uploadTrack(f);
  };

  const deleteTrack = async (t: Track) => {
    if (!confirm(`Delete "${t.name}"?`)) return;
    const { error } = await supabase.storage.from("background-music").remove([t.id]);
    if (error) toast.error(error.message); else { toast.success("Deleted"); tracks.refetch(); if (selectedTrack?.id === t.id) setSelectedTrack(null); }
  };

  const uploadFx = async (files: FileList) => {
    if (!user) return;
    for (const file of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage.from("fx-sounds").upload(path, file, { contentType: file.type });
      if (error) { toast.error(error.message); return; }
    }
    toast.success("FX uploaded"); fxPads.refetch();
  };
  const deleteFx = async (p: FxPad) => {
    if (!confirm(`Delete "${p.name}"?`)) return;
    const { error } = await supabase.storage.from("fx-sounds").remove([p.id]);
    if (error) toast.error(error.message); else { toast.success("Deleted"); fxPads.refetch(); }
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const peak = (v: number) => Math.round(v * 100);

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="font-display text-3xl flex items-center gap-2"><Radio className="h-7 w-7 text-[color:var(--gold)]" /> Recording studio</h1>
        <p className="text-sm text-muted-foreground">Pro dashboard with mic, royalty-free music bed, 8-band EQ, FX pads, auto-ducking, fades and trim.</p>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        {/* Main recording panel */}
        <div className="space-y-4">
          <div className="glass rounded-3xl p-6 space-y-4 shadow-elegant">
            <canvas ref={canvasRef} width={800} height={160} className="w-full h-40 rounded-xl bg-secondary/40" />

            <div className="grid grid-cols-2 gap-3">
              <Meter label="Mic" icon={Mic} level={micLevel} color="bg-gradient-gold" />
              <Meter label="Music" icon={Music2} level={musicLevel} color="bg-blue-500" />
            </div>

            <div className="text-center font-display text-5xl tabular-nums">{mm}:{ss}</div>
            <div className="text-center text-xs uppercase tracking-widest text-muted-foreground -mt-3">
              {state === "recording" && <span className="text-red-500 inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Recording</span>}
              {state === "paused" && "Paused"}
              {state === "done" && "Ready to publish"}
              {state === "idle" && "Standing by"}
            </div>

            <div className="flex justify-center gap-3 flex-wrap">
              {state === "idle" && (
                <button onClick={start} className="px-8 py-4 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine inline-flex items-center gap-2 shadow-3d hover:scale-105 transition"><Mic className="h-5 w-5" /> Start recording</button>
              )}
              {state === "recording" && (
                <>
                  <button onClick={pause} className="px-5 py-3 rounded-full bg-secondary inline-flex items-center gap-2"><Pause className="h-4 w-4" /> Pause</button>
                  <button onClick={stop} className="px-5 py-3 rounded-full bg-destructive text-destructive-foreground inline-flex items-center gap-2"><Square className="h-4 w-4" /> Stop & fade out</button>
                </>
              )}
              {state === "paused" && (
                <>
                  <button onClick={resume} className="px-5 py-3 rounded-full bg-gradient-gold text-primary-foreground inline-flex items-center gap-2"><Play className="h-4 w-4" /> Resume</button>
                  <button onClick={stop} className="px-5 py-3 rounded-full bg-destructive text-destructive-foreground inline-flex items-center gap-2"><Square className="h-4 w-4" /> Stop</button>
                </>
              )}
            </div>

            {state === "done" && url && (
              <div className="space-y-4 pt-4 border-t border-border/40">
                <audio src={url} controls className="w-full" />

                {/* Trim editor */}
                <div className="glass rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-semibold inline-flex items-center gap-2"><Scissors className="h-4 w-4 text-[color:var(--gold)]" /> Trim</h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label className="text-muted-foreground">Start (s)
                      <input type="number" min={0} step={0.1} value={trimStart.toFixed(2)} onChange={(e) => setTrimStart(Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
                    </label>
                    <label className="text-muted-foreground">End (s)
                      <input type="number" min={0} step={0.1} value={trimEnd.toFixed(2)} onChange={(e) => setTrimEnd(Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
                    </label>
                  </div>
                  <button onClick={applyTrim} disabled={trimming} className="px-4 py-2 rounded-full bg-secondary inline-flex items-center gap-2 text-sm">
                    {trimming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />} Apply trim
                  </button>
                </div>

                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Episode title" className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Show notes / topics..." className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm" />
                <div className="flex flex-wrap gap-2 justify-end">
                  <button onClick={aiNotes} disabled={aiBusy} className="px-5 py-2.5 rounded-full bg-secondary inline-flex items-center gap-2 text-sm">{aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI show notes</button>
                  <a href={url} download={`recording-${Date.now()}.${blob?.type.includes("wav") ? "wav" : "webm"}`} className="px-5 py-2.5 rounded-full bg-secondary inline-flex items-center gap-2 text-sm"><Download className="h-4 w-4" /> Download</a>
                  <button onClick={reset} className="px-5 py-2.5 rounded-full bg-secondary inline-flex items-center gap-2 text-sm"><Trash2 className="h-4 w-4" /> Discard</button>
                  <button onClick={upload} disabled={uploading} className="px-5 py-2.5 rounded-full bg-gradient-gold text-primary-foreground font-semibold btn-shine inline-flex items-center gap-2">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save as draft</button>
                </div>
              </div>
            )}
          </div>

          {/* 8-Band EQ */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-lg flex items-center gap-2"><Sliders className="h-4 w-4 text-[color:var(--gold)]" /> 8-band equalizer</h3>
              <button onClick={() => setEqGains(EQ_BANDS.map(() => 0))} className="text-xs px-3 py-1 rounded-full bg-secondary">Reset</button>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {EQ_BANDS.map((freq, i) => (
                <div key={freq} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] tabular-nums text-muted-foreground">{eqGains[i] > 0 ? "+" : ""}{eqGains[i].toFixed(0)}dB</span>
                  <input
                    type="range" min={-12} max={12} step={0.5}
                    value={eqGains[i]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setEqGains((prev) => prev.map((p, idx) => idx === i ? v : p));
                    }}
                    className="vertical-slider accent-[color:var(--gold)]"
                    style={{ writingMode: "vertical-lr" as any, WebkitAppearance: "slider-vertical" as any, height: 100, width: 20 }}
                  />
                  <span className="text-[10px] text-muted-foreground">{freq >= 1000 ? `${freq/1000}k` : freq}</span>
                </div>
              ))}
            </div>
          </div>

          {/* FX pads */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg flex items-center gap-2"><Zap className="h-4 w-4 text-[color:var(--gold)]" /> FX & brand pads</h3>
              <label className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-gold text-primary-foreground cursor-pointer btn-shine">
                <Plus className="h-3 w-3" /> Upload FX
                <input type="file" accept="audio/*" multiple className="hidden" onChange={(e) => e.target.files && uploadFx(e.target.files)} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Tap a pad to fire an effect. Pads are mixed into the recording when you're live.</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {fxPads.isLoading && <p className="text-xs text-muted-foreground col-span-full">Loading…</p>}
              {fxPads.data?.length === 0 && <p className="text-xs text-muted-foreground col-span-full">No FX yet. Upload short brand stings or sound effects.</p>}
              {fxPads.data?.map((p) => (
                <div key={p.id} className="relative group">
                  <button onClick={() => triggerFx(p)} className="w-full aspect-square rounded-xl bg-gradient-gold text-primary-foreground font-semibold text-xs btn-shine shadow-3d hover:scale-105 transition flex items-center justify-center p-2 text-center break-words">
                    {p.name}
                  </button>
                  <button onClick={() => deleteFx(p)} className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition" aria-label="Delete"><Trash2 className="h-3 w-3 mx-auto" /></button>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <label className="text-xs text-muted-foreground block mb-1">FX volume — {peak(fxVolume)}%</label>
              <input type="range" min={0} max={1} step={0.01} value={fxVolume} onChange={(e) => setFxVolume(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
            </div>
          </div>
        </div>

        {/* Right column: mixer + music library */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="font-display text-lg flex items-center gap-2"><Headphones className="h-4 w-4 text-[color:var(--gold)]" /> Mixer</h3>
            <Slider label={<><Mic className="h-3.5 w-3.5 inline mr-1" /> Mic volume — {peak(micVolume)}%</>} value={micVolume} onChange={setMicVolume} />
            <Slider label={<><Music2 className="h-3.5 w-3.5 inline mr-1" /> Music volume — {peak(musicVolume)}%</>} value={musicVolume} onChange={setMusicVolume} />
            <label className="flex items-center justify-between text-sm">
              <span>Auto-duck music while speaking</span>
              <input type="checkbox" checked={duckingEnabled} onChange={(e) => setDuckingEnabled(e.target.checked)} />
            </label>
            {duckingEnabled && (
              <Slider label={`Ducked level — ${peak(duckedLevel)}%`} value={duckedLevel} onChange={setDuckedLevel} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Fade in (s)
                <input type="number" min={0} max={20} value={fadeInSec} onChange={(e) => setFadeInSec(Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
              </label>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Fade out (s)
                <input type="number" min={0} max={20} value={fadeOutSec} onChange={(e) => setFadeOutSec(Number(e.target.value))} className="mt-1 w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm" />
              </label>
            </div>
          </div>

          {/* Noise filter */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg flex items-center gap-2"><Sliders className="h-4 w-4 text-[color:var(--gold)]" /> Noise filter</h3>
              <label className="text-xs inline-flex items-center gap-2">
                <input type="checkbox" checked={noiseFilterEnabled} onChange={(e) => setNoiseFilterEnabled(e.target.checked)} />
                {noiseFilterEnabled ? "On" : "Off"}
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">High-pass removes hum & rumble. Compressor evens dynamics and softens hiss.</p>
            <label className="block text-xs">
              <span className="block text-muted-foreground mb-1">High-pass — {noiseHpfHz} Hz</span>
              <input type="range" min={20} max={250} step={5} value={noiseHpfHz} disabled={!noiseFilterEnabled} onChange={(e) => setNoiseHpfHz(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
            </label>
            <label className="block text-xs">
              <span className="block text-muted-foreground mb-1">Compression — {Math.round(compressorAmount * 100)}%</span>
              <input type="range" min={0} max={1} step={0.01} value={compressorAmount} disabled={!noiseFilterEnabled} onChange={(e) => setCompressorAmount(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
            </label>
          </div>

          {/* Echo */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg flex items-center gap-2"><Radio className="h-4 w-4 text-[color:var(--gold)]" /> Echo</h3>
              <label className="text-xs inline-flex items-center gap-2">
                <input type="checkbox" checked={echoEnabled} onChange={(e) => setEchoEnabled(e.target.checked)} />
                {echoEnabled ? "On" : "Off"}
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground">Subtle slap-back or radio-style repeats. Keep mix low for natural voice.</p>
            <label className="block text-xs">
              <span className="block text-muted-foreground mb-1">Delay — {echoDelayMs} ms</span>
              <input type="range" min={40} max={900} step={10} value={echoDelayMs} disabled={!echoEnabled} onChange={(e) => setEchoDelayMs(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
            </label>
            <label className="block text-xs">
              <span className="block text-muted-foreground mb-1">Feedback — {Math.round(echoFeedback * 100)}%</span>
              <input type="range" min={0} max={0.9} step={0.01} value={echoFeedback} disabled={!echoEnabled} onChange={(e) => setEchoFeedback(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
            </label>
            <label className="block text-xs">
              <span className="block text-muted-foreground mb-1">Mix — {Math.round(echoMix * 100)}%</span>
              <input type="range" min={0} max={1} step={0.01} value={echoMix} disabled={!echoEnabled} onChange={(e) => setEchoMix(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
            </label>
          </div>


          <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg flex items-center gap-2"><Music4 className="h-4 w-4 text-[color:var(--gold)]" /> Music library</h3>
              <label className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-gold text-primary-foreground cursor-pointer btn-shine">
                <Upload className="h-3 w-3" /> Upload
                <input type="file" accept="audio/*" multiple className="hidden" onChange={(e) => e.target.files && uploadTracks(e.target.files)} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">Royalty-free only. Files are private to your account. Upload multiple at once.</p>

            {selectedTrack && (
              <div className="rounded-xl bg-secondary/50 border border-border p-3 space-y-1">
                <div className="text-xs text-[color:var(--gold)] truncate">▶ {selectedTrack.name}</div>
                <audio ref={musicElRef} src={selectedTrack.url} loop crossOrigin="anonymous" controls preload="metadata" className="w-full" />
                <p className="text-[10px] text-muted-foreground">Play, pause, seek. Auto-fades when you record if ducking is on.</p>
              </div>
            )}

            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {tracks.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
              {tracks.data?.length === 0 && <p className="text-xs text-muted-foreground">No tracks yet. Upload royalty-free music to use as bed.</p>}
              {tracks.data?.map((t) => {
                const active = selectedTrack?.id === t.id;
                return (
                  <div key={t.id} className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-sm ${active ? "border-[color:var(--gold)] bg-[color:var(--gold)]/10" : "border-border hover:bg-secondary"}`}>
                    <button onClick={() => setSelectedTrack(active ? null : t)} className="flex-1 text-left truncate">
                      {active ? "▶ " : ""}{t.name}
                    </button>
                    <button onClick={() => deleteTrack(t)} className="text-destructive p-1" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>
            {selectedTrack && state === "idle" && (
              <p className="text-xs text-[color:var(--gold)]">"{selectedTrack.name}" will fade in when you press record.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, icon: Icon, level, color }: { label: string; icon: any; level: number; color: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span className="inline-flex items-center gap-1"><Icon className="h-3 w-3" /> {label}</span>
        <span className="tabular-nums">{Math.round(level * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className={`${color} h-full transition-all duration-100`} style={{ width: `${Math.min(100, level * 140)}%` }} />
      </div>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: React.ReactNode; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs">
      <span className="block text-muted-foreground mb-1">{label}</span>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[color:var(--gold)]" />
    </label>
  );
}

// AudioBuffer → 16-bit PCM WAV
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numCh * 2 + 44;
  const ab = new ArrayBuffer(length);
  const view = new DataView(ab);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, length - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numCh * 2, true);
  view.setUint16(32, numCh * 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length - 44, true);
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return ab;
}

void Volume2;
