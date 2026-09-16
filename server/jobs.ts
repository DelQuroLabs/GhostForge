// Long-run job store: Stages, chapter gates, and revisions run for minutes —
// longer than a browser tab or preview proxy will wait on one request.
// Jobs decouple the run from the request: start returns immediately, the
// client polls status, and a dropped tab can reattach mid-run.
// In-memory by design: if the server dies, the run dies with it (there is
// nothing to reattach to), and the client says exactly that.
export type JobStatus = 'running' | 'done' | 'failed';
export type JobEvent = { t: string; stage: string; msg: string };
export type Job = {
  id: string; kind: 'create' | 'gates' | 'revise'; label: string;
  bookId: number | null; chapterId: number | null;
  status: JobStatus; stage: string;
  events: JobEvent[]; facts: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
  startedAt: string; finishedAt: string | null;
};

const jobs = new Map<string, Job>();
const MAX_JOBS = 50;

export function createJob(kind: Job['kind'], label: string, bookId: number | null, chapterId: number | null = null): Job {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const job: Job = {
    id, kind, label, bookId, chapterId, status: 'running', stage: 'starting',
    events: [], facts: {}, result: null, error: null,
    startedAt: new Date().toISOString(), finishedAt: null,
  };
  jobs.set(id, job);
  if (jobs.size > MAX_JOBS) {
    const oldest = [...jobs.values()].filter((j) => j.status !== 'running')
      .sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))[0];
    if (oldest) jobs.delete(oldest.id);
  }
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function listJobs(bookId?: number): Job[] {
  const all = [...jobs.values()].filter((j) => bookId === undefined || j.bookId === bookId);
  return all
    .sort((a, b) => ((a.status === 'running' ? 0 : 1) - (b.status === 'running' ? 0 : 1))
      || (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, 20);
}

export type Emit = (stage: string, msg: string, facts?: Record<string, unknown>) => void;

export function emitter(job: Job): Emit {
  return (stage, msg, facts) => {
    job.stage = stage;
    job.events.push({ t: new Date().toISOString(), stage, msg });
    if (job.events.length > 100) job.events.splice(0, job.events.length - 100);
    if (facts) Object.assign(job.facts, facts);
  };
}

export function finishJob(job: Job, result: Record<string, unknown>): void {
  job.status = 'done';
  job.finishedAt = new Date().toISOString();
  job.result = result;
  job.events.push({ t: job.finishedAt, stage: 'done', msg: 'Finished.' });
}

export function failJob(job: Job, code: string, message: string): void {
  job.status = 'failed';
  job.finishedAt = new Date().toISOString();
  job.error = { code, message };
  job.events.push({ t: job.finishedAt, stage: 'failed', msg: message });
}

// Fire-and-forget with capture: the route returns the job id immediately,
// the work lands here. HError codes pass through so the client can reuse
// its NO_KEY / STAGE_FAILED / GATE_FAILED messaging.
export function launch(job: Job, work: () => Promise<Record<string, unknown>>): void {
  void (async () => {
    try {
      finishJob(job, await work());
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'NO_KEY') failJob(job, 'NO_KEY', (e as Error).message);
      else if (code === 'NO_MODEL') failJob(job, 'NO_MODEL', (e as Error).message);
      else failJob(job, code && /^[A-Z_]+$/.test(code) ? code : 'JOB_FAILED', (e as Error).message ?? 'Run failed.');
    }
  })();
}
