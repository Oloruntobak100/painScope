import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { ReportHistory, WebhookDashboardMetrics } from '@/types';

function unwrapPayload(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    return data[0] as Record<string, unknown>;
  }
  if (typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

/** Persist webhook result to reports + pain_archetypes + pain_sources */
export async function persistReportAndPainsToSupabase(
  userId: string,
  briefingId: string | null,
  payload: unknown
): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;
  const sb = supabase!;
  const raw = unwrapPayload(payload);
  if (!raw) return;

  const pains = (raw.painLibrary ?? raw.pains) as Record<string, unknown>[] | undefined;
  const painCount = Array.isArray(pains) ? pains.length : 0;
  const rawMetrics = raw.dashboardMetrics as Record<string, unknown> | undefined;
  const avgPainScore = rawMetrics != null && Number(rawMetrics.avgPainScore ?? rawMetrics.averagePainScore) != null
    ? Number(rawMetrics.avgPainScore ?? rawMetrics.averagePainScore)
    : 0;
  const topPain = Array.isArray(pains) && pains.length > 0
    ? ((pains[0].archetype ?? pains[0].name) as string)
    : null;
  const comprehensiveReport = typeof raw.comprehensiveReport === 'string' ? raw.comprehensiveReport : null;
  const dashboardMetrics = rawMetrics && typeof rawMetrics === 'object' ? rawMetrics : {};
  const structuredData = raw.aiStructuredData && typeof raw.aiStructuredData === 'object'
    ? (raw.aiStructuredData as Record<string, unknown>)
    : {};

  const painSnapshot = Array.isArray(pains) ? pains : [];
  let reportRow: { id?: string } | null = null;
  let reportErr: { code?: string; message?: string } | null = null;
  const reportPayload = {
    user_id: userId,
    briefing_id: briefingId || null,
    pain_count: painCount,
    avg_pain_score: avgPainScore,
    top_pain: topPain,
    comprehensive_report: comprehensiveReport,
    dashboard_metrics: dashboardMetrics,
    structured_data: structuredData,
    pain_snapshot: painSnapshot,
  };
  const res = await sb.from('reports').insert(reportPayload).select('id').single();
  reportRow = res.data as { id?: string } | null;
  reportErr = res.error as { code?: string; message?: string } | null;
  if (reportErr && (reportErr.code === '42703' || (reportErr.message ?? '').includes('pain_snapshot'))) {
    const { pain_snapshot: _, ...rest } = reportPayload;
    const res2 = await sb.from('reports').insert(rest).select('id').single();
    reportRow = res2.data as { id?: string } | null;
    reportErr = res2.error as { code?: string; message?: string } | null;
  }
  if (reportErr || !reportRow?.id) {
    console.error('[PainScope] Failed to insert report:', reportErr);
    return;
  }
  const reportId = reportRow.id as string;

  if (!Array.isArray(pains) || pains.length === 0) return;

  const painRowBase = (p: Record<string, unknown>) => {
    const rev = (p.revenuePotential ?? p.revenue_potential) as Record<string, unknown> | undefined;
    const revRaw = rev?.raw != null ? Number(rev.raw) : (rev?.estimatedARR ?? rev?.estimated_arr != null ? Number(rev.estimatedARR ?? rev.estimated_arr) : 0);
    const painScore = Number(p.painScore ?? p.pain_score) ?? 0;
    const tags = Array.isArray(p.tags) ? (p.tags as string[]) : [];
    const freqHist = Array.isArray(p.frequencyHistory)
      ? (p.frequencyHistory as number[])
      : Array.isArray(p.frequency_history)
        ? (p.frequency_history as number[])
        : [];
    return {
      user_id: userId,
      name: (p.archetype ?? p.name) ?? '',
      description: (p.description as string) ?? '',
      pain_score: painScore,
      severity: Number(p.severity) ?? 0,
      frequency: Number(p.frequency) ?? 0,
      urgency: Number(p.urgency) ?? 0,
      competitive_saturation: Number(p.competitiveSaturation ?? p.competitive_saturation) ?? 0,
      tam: Number(rev?.tam) ?? revRaw * 10,
      sam: Number(rev?.sam) ?? revRaw * 2.5,
      som: Number(rev?.som) ?? revRaw * 0.5,
      estimated_arr: revRaw,
      confidence: Number(rev?.confidence) ?? 0.7,
      tags,
      frequency_history: freqHist,
    };
  };

  for (const p of pains) {
    const base = painRowBase(p);
    let painRow: { id?: string } | null = null;
    let painErr: { code?: string; message?: string } | null = null;

    const withReportId = { ...base, report_id: reportId };
    const res = await sb.from('pain_archetypes').insert(withReportId).select('id').single();
    painRow = res.data as { id?: string } | null;
    painErr = res.error as { code?: string; message?: string } | null;

    if (painErr && (painErr.code === '42703' || (painErr.message ?? '').includes('report_id'))) {
      const res2 = await sb.from('pain_archetypes').insert(base).select('id').single();
      painRow = res2.data as { id?: string } | null;
      painErr = res2.error as { code?: string; message?: string } | null;
    }

    if (painErr || !painRow?.id) {
      console.error('[PainScope] Failed to insert pain_archetype:', painErr);
      continue;
    }
    const painArchetypeId = painRow.id as string;

    const sources: Record<string, unknown>[] = [];
    if (Array.isArray(p.sources)) {
      sources.push(...p.sources);
    } else if (p.topSource && typeof p.topSource === 'object') {
      const ts = p.topSource as Record<string, unknown>;
      sources.push({
        url: ts.url ?? '',
        title: (ts.title ?? ts.name) ?? '',
        platform: (ts.name as string)?.toLowerCase() === 'news' ? 'news' : 'forum',
        snippet: (p.description as string) ?? '',
        sentiment: 'negative',
      });
    }

    for (const s of sources) {
      await sb.from('pain_sources').insert({
        pain_archetype_id: painArchetypeId,
        url: (s.url as string) ?? '',
        title: (s.title as string) ?? '',
        platform: (s.platform as string) ?? 'forum',
        snippet: (s.snippet as string) ?? '',
        sentiment: (s.sentiment as string) ?? 'neutral',
      });
    }
  }
}

/** Load report history for current user (Dashboard, Pain Library metrics) */
export async function loadReportHistory(userId: string): Promise<ReportHistory[]> {
  if (!isSupabaseConfigured() || !userId) return [];
  let rows: Record<string, unknown>[] | null = null;
  let error: { code?: string; message?: string } | null = null;
  const res1 = await supabase!
    .from('reports')
    .select('id, created_at, pain_count, avg_pain_score, top_pain, comprehensive_report, dashboard_metrics, structured_data, pain_snapshot')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  rows = (res1.data ?? null) as Record<string, unknown>[] | null;
  error = (res1.error ?? null) as { code?: string; message?: string } | null;
  if (error && (error.code === '42703' || (error.message ?? '').includes('pain_snapshot'))) {
    const res2 = await supabase!
      .from('reports')
      .select('id, created_at, pain_count, avg_pain_score, top_pain, comprehensive_report, dashboard_metrics, structured_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    rows = (res2.data ?? null) as Record<string, unknown>[] | null;
    error = (res2.error ?? null) as { code?: string; message?: string } | null;
  }
  if (error) {
    console.error('[PainScope] loadReportHistory error:', error);
    return [];
  }
  return (rows ?? []).map((r) => ({
    id: r.id as string,
    timestamp: new Date((r.created_at as string) ?? Date.now()),
    dashboardMetrics: (r.dashboard_metrics as WebhookDashboardMetrics) ?? {},
    painCount: Number(r.pain_count) ?? 0,
    avgPainScore: Number(r.avg_pain_score) ?? 0,
    topPain: (r.top_pain as string) ?? undefined,
    comprehensiveReport: (r.comprehensive_report as string) ?? undefined,
    structuredData: (r.structured_data as Record<string, unknown>) ?? undefined,
    painSnapshot: Array.isArray((r as { pain_snapshot?: unknown }).pain_snapshot) ? ((r as { pain_snapshot: Record<string, unknown>[] }).pain_snapshot) : undefined,
  }));
}

/** Load all reports for admin (Report History sidebar) with user name/email */
export async function loadAllReportsForAdmin(): Promise<ReportHistory[]> {
  if (!isSupabaseConfigured()) return [];
  let rows: Record<string, unknown>[] | null = null;
  let error: { code?: string; message?: string } | null = null;
  const res1 = await supabase!
    .from('reports')
    .select('id, user_id, created_at, pain_count, avg_pain_score, top_pain, comprehensive_report, dashboard_metrics, structured_data, pain_snapshot')
    .order('created_at', { ascending: false });
  rows = (res1.data ?? null) as Record<string, unknown>[] | null;
  error = (res1.error ?? null) as { code?: string; message?: string } | null;
  if (error && (error.code === '42703' || (error.message ?? '').includes('pain_snapshot'))) {
    const res2 = await supabase!
      .from('reports')
      .select('id, user_id, created_at, pain_count, avg_pain_score, top_pain, comprehensive_report, dashboard_metrics, structured_data')
      .order('created_at', { ascending: false });
    rows = (res2.data ?? null) as Record<string, unknown>[] | null;
    error = (res2.error ?? null) as { code?: string; message?: string } | null;
  }
  if (error) {
    console.error('[PainScope] loadAllReportsForAdmin error:', error);
    return [];
  }
  if (!rows?.length) return [];
  const userIds = [...new Set((rows as { user_id?: string }[]).map((r) => r.user_id).filter(Boolean))] as string[];
  const { data: profiles } = await supabase!
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds);
  const byId = new Map<string | undefined, { name?: string; email?: string }>();
  (profiles ?? []).forEach((p: { id?: string; name?: string; email?: string }) => {
    byId.set(p.id, { name: p.name, email: p.email });
  });
  return rows.map((r) => {
    const profile = byId.get((r as { user_id?: string }).user_id);
    const painSnap = (r as { pain_snapshot?: unknown }).pain_snapshot;
    return {
      id: r.id as string,
      timestamp: new Date((r.created_at as string) ?? Date.now()),
      dashboardMetrics: (r.dashboard_metrics as WebhookDashboardMetrics) ?? {},
      painCount: Number(r.pain_count) ?? 0,
      avgPainScore: Number(r.avg_pain_score) ?? 0,
      topPain: (r.top_pain as string) ?? undefined,
      comprehensiveReport: (r.comprehensive_report as string) ?? undefined,
      structuredData: (r.structured_data as Record<string, unknown>) ?? undefined,
      painSnapshot: Array.isArray(painSnap) ? (painSnap as Record<string, unknown>[]) : undefined,
      userId: (r as { user_id?: string }).user_id,
      userName: profile?.name ?? 'Unknown',
      userEmail: profile?.email ?? '',
    };
  });
}
