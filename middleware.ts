import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';

// AIクローラー/検索Botの検知ログをEmergence Monitorへfire-and-forget送信する。
// RefBase自体はSupabase認証情報を一切持たない（独立したReference Baseとして運用するため）。
// ページ表示を絶対に遅延させない: event.waitUntil() でレスポンス確定後にバックグラウンド送信する。

const BOT_PATTERNS: Array<[string, RegExp]> = [
  ['GPTBot',             /GPTBot/i],
  ['ChatGPT-User',       /ChatGPT-User/i],
  ['ClaudeBot',          /ClaudeBot/i],
  ['PerplexityBot',      /PerplexityBot/i],
  ['Perplexity-User',    /Perplexity-User/i],
  ['Googlebot',          /Googlebot/i],
  ['Bingbot',            /Bingbot/i],
  ['meta-externalagent', /meta-externalagent/i],
  ['Bytespider',         /Bytespider/i],
];

function detectBot(userAgent: string): string | null {
  for (const [name, pattern] of BOT_PATTERNS) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

function extractIds(pathname: string): { entityId?: string; referenceSlug?: string } {
  let m = pathname.match(/^\/reference\/([^/]+)\/([^/]+)/);
  if (m) return { entityId: decodeURIComponent(m[1]), referenceSlug: decodeURIComponent(m[2]) };

  m = pathname.match(/^\/api\/reference\/([^/]+)\/([^/]+)/);
  if (m) return { entityId: decodeURIComponent(m[1]), referenceSlug: decodeURIComponent(m[2]) };

  m = pathname.match(/^\/entity\/([^/]+)/);
  if (m) return { entityId: decodeURIComponent(m[1]) };

  m = pathname.match(/^\/api\/(?:entity|reference)\/([^/]+)/);
  if (m) return { entityId: decodeURIComponent(m[1]) };

  return {};
}

export function middleware(request: NextRequest, event: NextFetchEvent) {
  const userAgent = request.headers.get('user-agent') ?? '';
  const provider = detectBot(userAgent);

  if (provider) {
    const secret = process.env.EM_SHARED_SECRET;
    if (secret) {
      const { entityId, referenceSlug } = extractIds(request.nextUrl.pathname);
      const payload = {
        provider,
        userAgent,
        url: request.nextUrl.pathname + request.nextUrl.search,
        method: request.method,
        referrer: request.headers.get('referer') ?? undefined,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
        entityId,
        referenceSlug,
        accessedAt: new Date().toISOString(),
      };

      event.waitUntil(
        fetch('https://emergence-monitor.aisle-aio.ai/api/crawl-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify(payload),
        }).catch(() => {
          // ログ送信失敗はRefBaseの応答に一切影響させない
        }),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/entity/:path*',
    '/reference/:path*',
    '/llms.txt',
    '/sitemap.xml',
    '/api/entity/:path*',
    '/api/reference/:path*',
  ],
};
