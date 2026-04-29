import { getServiceClient } from './supabase';

export interface JobPayload {
  [key: string]: unknown;
}

export interface JobQueueRow {
  id: string;
  queue_name: string;
  job_type: string;
  payload: JobPayload;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'dead' | 'cancelled';
  run_at: string;
  attempts: number;
  max_attempts: number;
  locked_by?: string | null;
  locked_at?: string | null;
  lease_until?: string | null;
  last_error?: string | null;
  last_error_at?: string | null;
  result?: JobPayload | null;
  source_table?: string | null;
  source_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface EnqueueJobInput {
  queueName: string;
  jobType: string;
  payload: JobPayload;
  dedupeKey?: string;
  priority?: number;
  runAt?: string;
  maxAttempts?: number;
  sourceTable?: string;
  sourceId?: string;
  createdBy?: string;
}

export interface ClaimJobsInput {
  workerId: string;
  limit?: number;
  queueName?: string;
  leaseSeconds?: number;
}

function toJobRow(value: Record<string, unknown>): JobQueueRow {
  return {
    id: String(value.id ?? ''),
    queue_name: String(value.queue_name ?? 'default'),
    job_type: String(value.job_type ?? ''),
    payload: (value.payload as JobPayload | null) ?? {},
    priority: Number(value.priority ?? 100),
    status: String(value.status ?? 'pending') as JobQueueRow['status'],
    run_at: String(value.run_at ?? new Date().toISOString()),
    attempts: Number(value.attempts ?? 0),
    max_attempts: Number(value.max_attempts ?? 8),
    locked_by: value.locked_by != null ? String(value.locked_by) : null,
    locked_at: value.locked_at != null ? String(value.locked_at) : null,
    lease_until: value.lease_until != null ? String(value.lease_until) : null,
    last_error: value.last_error != null ? String(value.last_error) : null,
    last_error_at: value.last_error_at != null ? String(value.last_error_at) : null,
    result: (value.result as JobPayload | null) ?? null,
    source_table: value.source_table != null ? String(value.source_table) : null,
    source_id: value.source_id != null ? String(value.source_id) : null,
    created_by: value.created_by != null ? String(value.created_by) : null,
    created_at: value.created_at != null ? String(value.created_at) : undefined,
    updated_at: value.updated_at != null ? String(value.updated_at) : undefined,
    completed_at: value.completed_at != null ? String(value.completed_at) : null,
  };
}

export async function enqueueJob(input: EnqueueJobInput): Promise<JobQueueRow> {
  const client = getServiceClient();
  const { data, error } = await client
    .from('job_queue')
    .insert({
      queue_name: input.queueName,
      job_type: input.jobType,
      payload: input.payload,
      dedupe_key: input.dedupeKey ?? null,
      priority: input.priority ?? 100,
      run_at: input.runAt ?? new Date().toISOString(),
      max_attempts: input.maxAttempts ?? 8,
      source_table: input.sourceTable ?? null,
      source_id: input.sourceId ?? null,
      created_by: input.createdBy ?? null,
    })
    .select('*')
    .single();

  if (error?.code === '23505' && input.dedupeKey) {
    const { data: existing, error: existingError } = await client
      .from('job_queue')
      .select('*')
      .eq('dedupe_key', input.dedupeKey)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return toJobRow(existing as Record<string, unknown>);
    }
  }

  if (error) {
    throw error;
  }

  return toJobRow((data ?? {}) as Record<string, unknown>);
}

export async function claimJobs(input: ClaimJobsInput): Promise<JobQueueRow[]> {
  const { data, error } = await getServiceClient().rpc('claim_jobs', {
    p_worker_id: input.workerId,
    p_limit: input.limit ?? 10,
    p_queue_name: input.queueName ?? null,
    p_lease_seconds: input.leaseSeconds ?? 300,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Record<string, unknown>[]).map(toJobRow);
}

export async function completeJob(jobId: string, result?: JobPayload): Promise<void> {
  const { error } = await getServiceClient()
    .from('job_queue')
    .update({
      status: 'completed',
      result: result ?? {},
      completed_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null,
      lease_until: null,
      last_error: null,
      last_error_at: null,
    })
    .eq('id', jobId);

  if (error) {
    throw error;
  }
}

export function getRetryDelayMs(attempts: number): number {
  const schedule = [30_000, 120_000, 600_000, 1_800_000, 7_200_000, 21_600_000];
  return schedule[Math.min(Math.max(attempts - 1, 0), schedule.length - 1)];
}

export async function failJob(job: Pick<JobQueueRow, 'id' | 'attempts' | 'max_attempts'>, errorMessage: string): Promise<'retry' | 'dead'> {
  const terminal = job.attempts >= job.max_attempts;
  const nextRunAt = new Date(Date.now() + getRetryDelayMs(job.attempts)).toISOString();

  const { error } = await getServiceClient()
    .from('job_queue')
    .update(terminal ? {
      status: 'dead',
      last_error: errorMessage,
      last_error_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null,
      lease_until: null,
    } : {
      status: 'pending',
      run_at: nextRunAt,
      last_error: errorMessage,
      last_error_at: new Date().toISOString(),
      locked_by: null,
      locked_at: null,
      lease_until: null,
    })
    .eq('id', job.id);

  if (error) {
    throw error;
  }

  return terminal ? 'dead' : 'retry';
}