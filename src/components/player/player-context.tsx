import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string | null;
  slug?: string;
}

export const PLAYER_EQ_BANDS = [60, 250, 1000, 4000, 12000];

interface PlayerState {
  current: Track | null;
  queue: Track[];
  playing: boolean;
  loading: boolean;
  error: string | null;
  position: number;
  duration: number;
  speed: number;
  volume: number;
  eqEnabled: boolean;
  eqGains: number[];
  setEqEnabled: (v: boolean) => void;
  setEqGain: (band: number, v: number) => void;
  resetEq: () => void;
  play: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setSpeed: (s: number) => void;
  setVolume: (v: number) => void;
  enqueue: (t: Track) => void;
  clearQueue: () => void;
}


const Ctx = createContext<PlayerState | null>(null);

const LS_CURRENT = "syz-current-track";
const LS_QUEUE = "syz-queue";
const LS_SPEED = "syz-speed";
const LS_VOLUME = "syz-volume";
const LS_EQ = "syz-eq";


function readLS<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function writeLS(key: string, v: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const srcNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqFiltersRef = useRef<BiquadFilterNode[]>([]);
  const userIdRef = useRef<string | null>(null);
  const lastSyncRef = useRef<number>(0);
  const autoPlayRef = useRef<boolean>(false); // only autoplay after user gesture
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [volume, setVolumeState] = useState(1);
  const [eqEnabled, setEqEnabledState] = useState(false);
  const [eqGains, setEqGains] = useState<number[]>(() => PLAYER_EQ_BANDS.map(() => 0));


  // restore preferences + last track (paused) on mount
  useEffect(() => {
    const s = readLS<number>(LS_SPEED); if (s) setSpeedState(s);
    const v = readLS<number>(LS_VOLUME); if (v != null) setVolumeState(v);
    const c = readLS<Track>(LS_CURRENT); if (c) setCurrent(c);
    const q = readLS<Track[]>(LS_QUEUE); if (q) setQueue(q);
    const eq = readLS<{ enabled: boolean; gains: number[] }>(LS_EQ);
    if (eq) {
      setEqEnabledState(!!eq.enabled);
      if (Array.isArray(eq.gains) && eq.gains.length === PLAYER_EQ_BANDS.length) setEqGains(eq.gains);
    }
  }, []);


  // track user id for history sync
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { userIdRef.current = data.user?.id ?? null; });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      userIdRef.current = s?.user?.id ?? null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // create audio element on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;
    // Web Audio EQ chain (built once on element creation)
    try {
      if (!audioCtxRef.current) {
        const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      const actx = audioCtxRef.current;
      if (actx) {
        const src = actx.createMediaElementSource(a);
        srcNodeRef.current = src;
        const filters = PLAYER_EQ_BANDS.map((freq, i) => {
          const f = actx.createBiquadFilter();
          f.type = i === 0 ? "lowshelf" : i === PLAYER_EQ_BANDS.length - 1 ? "highshelf" : "peaking";
          f.frequency.value = freq;
          f.Q.value = 1.0;
          f.gain.value = eqEnabled ? (eqGains[i] ?? 0) : 0;
          return f;
        });
        eqFiltersRef.current = filters;
        let node: AudioNode = src;
        for (const f of filters) { node.connect(f); node = f; }
        node.connect(actx.destination);
      }
    } catch { /* fallback: element plays normally */ }

    const onTime = () => {
      setPosition(a.currentTime);

      // persist position locally
      if (current) {
        try { localStorage.setItem(`syz-pos-${current.id}`, String(a.currentTime)); } catch {}
      }
      // sync to supabase every 15s
      const now = Date.now();
      if (userIdRef.current && current && now - lastSyncRef.current > 15000) {
        lastSyncRef.current = now;
        const pos = Math.floor(a.currentTime);
        const completed = a.duration ? a.currentTime / a.duration > 0.95 : false;
        supabase.from("listening_history").upsert(
          { user_id: userIdRef.current, podcast_id: current.id, position_seconds: pos, completed, last_played_at: new Date().toISOString() },
          { onConflict: "user_id,podcast_id" } as any,
        ).then(() => {});
      }
    };
    const onDur = () => setDuration(a.duration || 0);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onPlay = () => { setPlaying(true); setLoading(false); };
    const onPause = () => setPlaying(false);
    const onError = () => { setLoading(false); setPlaying(false); setError("Audio could not be loaded."); };
    const onEnd = () => {
      setPlaying(false);
      autoPlayRef.current = true;
      setQueue((q) => {
        if (q.length > 0) {
          const [n, ...rest] = q;
          setCurrent(n);
          return rest;
        }
        return q;
      });
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("playing", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onError);
    a.addEventListener("ended", onEnd);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("playing", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onError);
      a.removeEventListener("ended", onEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // load current track when it changes
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    setError(null);
    setLoading(true);
    if (a.src !== current.audioUrl) {
      a.src = current.audioUrl;
      a.load();
    }
    a.playbackRate = speed;
    a.volume = volume;
    // resume position
    try {
      const saved = localStorage.getItem(`syz-pos-${current.id}`);
      if (saved) {
        const onMeta = () => { a.currentTime = Math.min(Number(saved), (a.duration || 1) - 1); a.removeEventListener("loadedmetadata", onMeta); };
        a.addEventListener("loadedmetadata", onMeta);
      }
    } catch {}
    writeLS(LS_CURRENT, current);
    if (autoPlayRef.current) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => { writeLS(LS_QUEUE, queue); }, [queue]);
  useEffect(() => { writeLS(LS_SPEED, speed); }, [speed]);
  useEffect(() => { writeLS(LS_VOLUME, volume); }, [volume]);

  const play = useCallback((track: Track, q: Track[] = []) => {
    autoPlayRef.current = true;
    setQueue(q);
    // If same track, just play
    const a = audioRef.current;
    if (current && current.id === track.id && a) {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }
    setCurrent(track);
  }, [current]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    autoPlayRef.current = true;
    if (a.paused) { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
    else { a.pause(); setPlaying(false); }
  }, [current]);

  const next = useCallback(() => {
    autoPlayRef.current = true;
    setQueue((q) => {
      if (q.length === 0) return q;
      const [n, ...rest] = q;
      setCurrent(n);
      return rest;
    });
  }, []);

  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a) a.currentTime = 0;
  }, []);

  const seek = useCallback((s: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = s;
  }, []);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const enqueue = useCallback((t: Track) => setQueue((q) => (q.find((x) => x.id === t.id) ? q : [...q, t])), []);
  const clearQueue = useCallback(() => setQueue([]), []);

  const value = useMemo(() => ({
    current, queue, playing, loading, error, position, duration, speed, volume,
    play, toggle, next, prev, seek, setSpeed, setVolume, enqueue, clearQueue,
  }), [current, queue, playing, loading, error, position, duration, speed, volume,
      play, toggle, next, prev, seek, setSpeed, setVolume, enqueue, clearQueue]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be inside PlayerProvider");
  return v;
}
