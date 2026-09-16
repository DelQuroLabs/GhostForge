import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ApiError, type Job } from './api';

// Long engine runs (Stages, chapter gates, revisions) outlast a single
// request's patience — the tab or proxy can give up while the server keeps
// working. So the server runs them as jobs: start returns an id at once,
// this hook polls until the run lands, and the id is remembered in
// localStorage so a reloaded tab can reattach to a live run.

const KEY = 'gf-jobs';
const POLL_MS = 2500;

export type TrackedJob = { id: string; kind: Job['kind']; label: string; bookId?: string; at: number };

export function rememberJob(j: Omit<TrackedJob, 'at'>): void {
  try {
    const raw = localStorage.getItem(KEY);
    const list: TrackedJob[] = raw ? (JSON.parse(raw) as TrackedJob[]) : [];
    const next = [{ ...j, at: Date.now() }, ...list.filter((x) => x.id !== j.id)].slice(0, 8);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* private mode — reattach just won't survive */ }
}

export function forgetJob(id: string): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const list = (JSON.parse(raw) as TrackedJob[]).filter((x) => x.id !== id);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch { /* ignore */ }
}

export function trackedJobs(): TrackedJob[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TrackedJob[]) : [];
  } catch {
    return [];
  }
}

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [gone, setGone] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => {
    setJob(null);
    setGone(false);
    setFailed(false);
    stop();
    if (!jobId) return;
    let alive = true;
    const poll = async () => {
      try {
        const j = await api.engine.jobs.status(jobId);
        if (!alive) return;
        setJob(j);
        if (j.status !== 'running') {
          stop();
          if (j.status === 'failed') setFailed(true);
        }
      } catch (e) {
        if (!alive) return;
        const code = (e as ApiError)?.code;
        if (code === 'JOB_GONE') {
          // The run is gone from the server (finished long ago, or the
          // server restarted). Only the newest event list is lost — any
          // book or chapter that landed is safe on the shelf.
          setGone(true);
          stop();
        }
        // Any other error is transient (network blip) — keep polling.
      }
    };
    void poll();
    timer.current = setInterval(() => void poll(), POLL_MS);
    return () => {
      alive = false;
      stop();
    };
  }, [jobId, stop]);

  return { job, gone, failed, stop };
}
