import { SupabaseClient } from '@supabase/supabase-js';

export type ProgressStep =
  | 'analyzing_business'
  | 'building_brief'
  | 'designing_theme'
  | 'writing_copy'
  | 'finalizing';

export type ProgressStatus = 'started' | 'progress' | 'completed' | 'error';

interface EmitArgs {
  supabase: SupabaseClient;
  userId: string;
  businessId: string;
  generationId: string;
  step: ProgressStep;
  status: ProgressStatus;
  message?: string;
}

/**
 * Insert a progress event the wizard subscribes to via Realtime.
 * Errors are swallowed — progress streaming is best-effort and must NEVER
 * block or fail the actual AI generation.
 */
export async function emitProgress(args: EmitArgs): Promise<void> {
  try {
    await args.supabase.from('ai_generation_events').insert({
      user_id: args.userId,
      business_id: args.businessId,
      generation_id: args.generationId,
      step: args.step,
      status: args.status,
      message: args.message ?? null,
    });
  } catch (err) {
    // Don't throw — progress is best-effort.
    console.warn('[ai-progress] emit failed (non-fatal):', err);
  }
}
