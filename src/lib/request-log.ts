import { prisma } from '@/lib/db';

export type LogEntry = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string | null;
  tokenId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

// Fire-and-forget. Never throws; never awaited by caller.
export function logApiRequest(entry: LogEntry): void {
  prisma.apiRequestLog
    .create({
      data: {
        method: entry.method,
        path: entry.path,
        status: entry.status,
        durationMs: entry.durationMs,
        userId: entry.userId ?? null,
        tokenId: entry.tokenId ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null
      }
    })
    .catch(() => {});
}

export function extractClientMeta(req: Request): { ip: string | null; userAgent: string | null } {
  const ua = req.headers.get('user-agent');
  const fwd = req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? null;
  return { ip, userAgent: ua };
}
