import type { Metadata } from 'next';
import { kv } from '@vercel/kv';
import { getGlobalIndex, getEntityIndex, getReference } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'RefBase Growth Dashboard (Internal)',
  robots: { index: false, follow: false },
};

// ── 型（このページ専用のゆるい型。lib/types.ts の正式型は更新しない） ──
interface CompanyRecord {
  id: string;
  entityType?: string;
  primaryCluster?: string;
  parentEntity?: string | null;
  verificationStatus?: 'draft' | 'verified' | 'featured';
  [key: string]: unknown;
}

interface EvidenceRecord {
  evidenceId?: string;
  needsVerification?: boolean;
  sourceVerified?: boolean;
  coverageType?: string[];
  [key: string]: unknown;
}

interface ClusterRegistryEnvelope {
  version: string;
  updatedAt: string;
  items: Array<{ clusterId: string; slug: string; name: string; entityCount: number; status: string }>;
}

interface RelationshipRegistryEnvelope {
  version: string;
  updatedAt: string;
  items: Array<{ relationshipId: string; relationshipType: string; status: string }>;
}

const ENTITY_TYPES = ['company', 'product', 'service', 'person', 'concept', 'organization', 'other'] as const;
const PROMPT_TYPE_IDS = ['P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06'];

async function loadMetrics() {
  const allSlugs = await getGlobalIndex();

  const companies = await Promise.all(
    allSlugs.map(slug => kv.get<CompanyRecord>(`refbase:company:${slug}`)),
  );
  const indices = await Promise.all(allSlugs.map(slug => getEntityIndex(slug)));
  const evidenceLists = await Promise.all(
    allSlugs.map(slug => kv.get<EvidenceRecord[]>(`evidence:${slug}`)),
  );

  const refKeys: { slug: string; qslug: string }[] = [];
  allSlugs.forEach((slug, i) => {
    for (const qslug of indices[i] ?? []) refKeys.push({ slug, qslug });
  });
  const refRecords = await Promise.all(
    refKeys.map(({ slug, qslug }) => getReference(slug, qslug)),
  );

  const clusterRegistry = await kv.get<ClusterRegistryEnvelope>('refbase:registry:clusters');
  const relationshipRegistry = await kv.get<RelationshipRegistryEnvelope>('refbase:registry:relationships');

  const entityCount = allSlugs.length;
  const referenceCount = refKeys.length;
  const evidenceCount = evidenceLists.reduce((sum, list) => sum + (list?.length ?? 0), 0);

  // Cluster数・Relationship数は正式Registryから算出（近似ではない）。ACTIVE件数を主表示、total件数を補足表示する。
  const clusterActiveCount = clusterRegistry?.items.filter(c => c.status === 'ACTIVE').length ?? null;
  const clusterTotalCount = clusterRegistry?.items.length ?? null;
  const relationshipActiveCount = relationshipRegistry?.items.filter(r => r.status === 'ACTIVE').length ?? null;
  const relationshipTotalCount = relationshipRegistry?.items.length ?? null;
  const parentEntitySetCount = companies.filter(c => c?.parentEntity).length;

  const verificationStatusCounts: Record<string, number> = { draft: 0, verified: 0, featured: 0, unset: 0 };
  for (const c of companies) {
    const status = c?.verificationStatus;
    if (status === 'draft' || status === 'verified' || status === 'featured') verificationStatusCounts[status]++;
    else verificationStatusCounts.unset++;
  }
  const statusKnownTotal = verificationStatusCounts.draft + verificationStatusCounts.verified + verificationStatusCounts.featured;
  const verifiedRate = statusKnownTotal > 0
    ? Math.round(((verificationStatusCounts.verified + verificationStatusCounts.featured) / statusKnownTotal) * 1000) / 10
    : null;
  const draftRate = statusKnownTotal > 0
    ? Math.round((verificationStatusCounts.draft / statusKnownTotal) * 1000) / 10
    : null;

  const entityTypeCounts: Record<string, number> = Object.fromEntries(ENTITY_TYPES.map(t => [t, 0]));
  for (const c of companies) {
    const t = c?.entityType && (ENTITY_TYPES as readonly string[]).includes(c.entityType) ? c.entityType : 'other';
    entityTypeCounts[t] = (entityTypeCounts[t] ?? 0) + 1;
  }

  const clusterEntityCounts: Record<string, number> = {};
  for (const c of companies) {
    const cluster = c?.primaryCluster ?? '(未設定)';
    clusterEntityCounts[cluster] = (clusterEntityCounts[cluster] ?? 0) + 1;
  }

  const pidCounts: Record<string, number> = Object.fromEntries(PROMPT_TYPE_IDS.map(p => [p, 0]));
  for (const ref of refRecords) {
    const pid = ref?.promptTypeId;
    if (pid && pid in pidCounts) pidCounts[pid]++;
  }

  const relationshipTypeCounts: Record<string, number> = {};
  for (const r of relationshipRegistry?.items ?? []) {
    relationshipTypeCounts[r.relationshipType] = (relationshipTypeCounts[r.relationshipType] ?? 0) + 1;
  }

  const draftEntities = allSlugs
    .map((slug, i) => ({ slug, company: companies[i] }))
    .filter(({ company }) => company?.verificationStatus === 'draft')
    .map(({ slug, company }) => ({ slug, entityType: company?.entityType, primaryCluster: company?.primaryCluster }));

  const unverifiedEvidence: { slug: string; evidenceId?: string; needsVerification?: boolean; sourceVerified?: boolean }[] = [];
  allSlugs.forEach((slug, i) => {
    for (const ev of evidenceLists[i] ?? []) {
      if (ev.needsVerification === true || ev.sourceVerified !== true) {
        unverifiedEvidence.push({ slug, evidenceId: ev.evidenceId, needsVerification: ev.needsVerification, sourceVerified: ev.sourceVerified });
      }
    }
  });

  const credibilityGapEntities: string[] = [];
  allSlugs.forEach((slug, i) => {
    const hasVerifiedCredibility = (evidenceLists[i] ?? []).some(
      ev => (ev.coverageType ?? []).includes('Credibility') && ev.needsVerification !== true && ev.sourceVerified === true,
    );
    if (!hasVerifiedCredibility) credibilityGapEntities.push(slug);
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      entityCount, referenceCount, evidenceCount,
      clusterActiveCount, clusterTotalCount, clusterRegistryVersion: clusterRegistry?.version ?? null,
      relationshipActiveCount, relationshipTotalCount, relationshipRegistryVersion: relationshipRegistry?.version ?? null,
      parentEntitySetCount, verifiedRate, draftRate,
    },
    verificationStatus: verificationStatusCounts,
    coverage: { byEntityType: entityTypeCounts, byCluster: clusterEntityCounts, byPromptTypeId: pidCounts, byRelationshipType: relationshipTypeCounts },
    backlog: { draftEntities, unverifiedEvidence, credibilityGapEntities },
  };
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function CountTable({ title, counts, note }: { title: string; counts: Record<string, number>; note?: string }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">{title}</h3>
      {note && <p className="text-xs text-amber-600 mb-3">{note}</p>}
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-100">
          {entries.map(([key, count]) => (
            <tr key={key}>
              <td className="py-1.5 text-slate-600">{key}</td>
              <td className="py-1.5 text-right font-mono font-semibold text-slate-800">{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RefBaseGrowthDashboardPage() {
  const data = await loadMetrics();

  const lastUpdatedJst = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(data.generatedAt)).replace(' ', ' ');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800 mb-1">RefBase Growth Dashboard</h1>
          <p className="text-sm text-slate-500">内部運用専用（Read Only）。RefBase本番KVから毎回再集計。</p>
          <p className="text-xs text-slate-400 mt-1">Last updated: {lastUpdatedJst} JST</p>
        </div>
        <a
          href="/admin/refbase-growth"
          className="shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          ↻ Refresh
        </a>
      </div>

      {/* 1. Summary Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        <SummaryCard label="Entities" value={data.summary.entityCount} />
        <SummaryCard label="References" value={data.summary.referenceCount} />
        <SummaryCard label="Evidence" value={data.summary.evidenceCount} />
        <SummaryCard
          label="Relationships"
          value={data.summary.relationshipActiveCount ?? 'N/A'}
          sub={
            data.summary.relationshipTotalCount !== null
              ? `${data.summary.relationshipActiveCount} active / ${data.summary.relationshipTotalCount} total`
              : 'Registry未登録'
          }
        />
        <SummaryCard label="Verified率" value={data.summary.verifiedRate !== null ? `${data.summary.verifiedRate}%` : '—'} />
        <SummaryCard label="Draft率" value={data.summary.draftRate !== null ? `${data.summary.draftRate}%` : '—'} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SummaryCard
          label="Clusters"
          value={data.summary.clusterActiveCount ?? 'N/A'}
          sub={
            data.summary.clusterTotalCount !== null
              ? `${data.summary.clusterActiveCount} active / ${data.summary.clusterTotalCount} total`
              : 'Registry未登録'
          }
        />
        <SummaryCard label="参考: parentEntity設定済みEntity数" value={data.summary.parentEntitySetCount} />
      </div>

      {/* 2. Verification Status */}
      <CountTable
        title="Verification Status"
        counts={data.verificationStatus}
        note="unset = verificationStatusフィールド未設定（Growth Sprintで追加した既存Entity）"
      />

      {/* 3. Coverage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CountTable title="P-ID別 Reference数" counts={data.coverage.byPromptTypeId} />
        <CountTable title="EntityType別件数" counts={data.coverage.byEntityType} />
        <CountTable title="Cluster別 Entity数" counts={data.coverage.byCluster} />
        <CountTable title="Relationship種別件数（正式Registry）" counts={data.coverage.byRelationshipType} />
      </div>

      {/* 4. Backlog */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-700">Backlog</h2>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            verificationStatus = draft のEntity（{data.backlog.draftEntities.length}件）
          </h3>
          <ul className="text-sm space-y-1">
            {data.backlog.draftEntities.map(e => (
              <li key={e.slug} className="flex gap-3 text-slate-600">
                <span className="font-mono">{e.slug}</span>
                <span className="text-slate-400">{e.entityType} / {e.primaryCluster}</span>
              </li>
            ))}
            {data.backlog.draftEntities.length === 0 && <li className="text-slate-400">該当なし</li>}
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            未検証Evidence（sourceVerified=false または needsVerification=true）（{data.backlog.unverifiedEvidence.length}件）
          </h3>
          <ul className="text-sm space-y-1 max-h-64 overflow-auto">
            {data.backlog.unverifiedEvidence.map((e, i) => (
              <li key={i} className="flex gap-3 text-slate-600">
                <span className="font-mono">{e.slug}</span>
                <span className="font-mono text-slate-400">{e.evidenceId}</span>
                <span className="text-xs text-amber-600">
                  needsVerification={String(e.needsVerification)} / sourceVerified={String(e.sourceVerified)}
                </span>
              </li>
            ))}
            {data.backlog.unverifiedEvidence.length === 0 && <li className="text-slate-400">該当なし</li>}
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Credibility Evidence不足Entity（{data.backlog.credibilityGapEntities.length}件）
          </h3>
          <ul className="text-sm space-y-1">
            {data.backlog.credibilityGapEntities.map(slug => (
              <li key={slug} className="font-mono text-slate-600">{slug}</li>
            ))}
            {data.backlog.credibilityGapEntities.length === 0 && <li className="text-slate-400">該当なし</li>}
          </ul>
        </div>
      </div>

      {/* Aisle Studio連携方針 */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-500 space-y-2">
        <p className="font-semibold text-slate-600">このDashboardについて</p>
        <p>
          RefBase Growth Dashboardは、RefBaseのKV状態を集計する内部運用画面です。
          そのため、Claude Code経由で追加したEntity/Reference/Evidenceも、将来的にAisle Studio経由で追加・公開された
          Entity/Reference/Evidenceも、同じKV（<code className="font-mono">refbase:company:*</code> /
          <code className="font-mono"> refbase:ref:*</code> / <code className="font-mono">refbase:index:*</code> /
          <code className="font-mono"> evidence:*</code>）に保存されれば自動的に集計対象になります。
        </p>
        <p>
          今後は、手動追加だけでなくAisle StudioのAuthoring / PublishフローからRefBaseへ追加されたKnowledgeも、
          このDashboardで同じように可視化されることを前提にします。
        </p>
        <p className="text-amber-600">
          注：Cluster / Relationship Registry（<code className="font-mono">refbase:registry:clusters</code> /
          <code className="font-mono"> refbase:registry:relationships</code>）は、現時点ではAisle Studioの
          生成フローから自動更新されず、単発の登録スクリプトでのみ更新されます。Entity/Reference/Evidenceが増えても
          Clusters / Relationshipsカードの数値は自動追従しない点にご注意ください。
        </p>
      </div>
    </div>
  );
}
