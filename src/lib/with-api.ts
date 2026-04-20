import { NextResponse } from 'next/server';
import { authorize, type Scope, type Who } from '@/lib/api-auth';
import { logApiRequest, extractClientMeta } from '@/lib/request-log';

type Ctx = { params?: Record<string, string> };
type Handler<C extends Ctx> = (
  req: Request,
  ctx: C,
  who: Who
) => Promise<NextResponse> | NextResponse;

export function withApi<C extends Ctx>(scope: Scope, handler: Handler<C>) {
  return async (req: Request, ctx: C) => {
    const started = Date.now();
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    const { ip, userAgent } = extractClientMeta(req);

    let status = 500;
    let who: Who | null = null;
    try {
      const result = await authorize(req, scope);
      if (result instanceof NextResponse) {
        status = result.status;
        return result;
      }
      who = result;
      const res = await handler(req, ctx, who);
      status = res.status;
      return res;
    } catch (err) {
      status = 500;
      throw err;
    } finally {
      logApiRequest({
        method,
        path,
        status,
        durationMs: Date.now() - started,
        userId: who?.userId ?? null,
        tokenId: who?.tokenId ?? null,
        ip,
        userAgent
      });
    }
  };
}
