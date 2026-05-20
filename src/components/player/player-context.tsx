import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export interface Track {
  id: string;
  title: string;
  artist?: string;
  audioUrl: string;
  coverImage?: string | null;
  slug?: string;
}

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
  play: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (s: number) => void;
  setSpeed: (s: number) => void;
  setVolume: (v: number) => void;
  enqueue: (t: Track) => void;
}

const Ctx = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [volume, setVolumeState] = useState(1);

  // create audio element on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = new Audio();
    a.preload = "metadata";
    audioRef.current = a;
    const onTime = () => setPosition(a.currentTime);
    const onDur = () => setDuration(a.duration || 0);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onPlay = () => { setPlaying(true); setLoading(false); };
    const onPause = () => setPlaying(false);
    const onError = () => { setLoading(false); setPlaying(false); setError("Audio could not be loaded."); };
    const onEnd = () => {
      setPlaying(false);
      // auto-next
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
  }, []);

  // load current track
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    setError(null);
    setLoading(true);
    a.src = current.audioUrl;
    a.playbackRate = speed;
    a.volume = volume;
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    // continue-listening from localStorage
    try {
      const saved = localStorage.getItem(`syz-pos-${current.id}`);
      if (saved) a.currentTime = Number(saved);
    } catch {}
  }, [current]); // eslint-disable-line

  // persist position
  useEffect(() => {
    if (!current) return;
    try { localStorage.setItem(`syz-pos-${current.id}`, String(position)); } catch {}
  }, [position, current]);

  const play = useCallback((track: Track, q: Track[] = []) => {
    setQueue(q);
    setCurrent(track);
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  }, [current]);

  const next = useCallback(() => {
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

  const enqueue = useCallback((t: Track) => setQueue((q) => [...q, t]), []);

  const value = useMemo(() => ({
    current, queue, playing, loading, error, position, duration, speed, volume,
    play, toggle, next, prev, seek, setSpeed, setVolume, enqueue,
  }), [current, queue, playing, loading, error, position, duration, speed, volume,
      play, toggle, next, prev, seek, setSpeed, setVolume, enqueue]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlayer must be inside PlayerProvider");
  return v;
}
