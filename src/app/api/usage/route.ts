import { getLatestUsage, getSessionUsage } from '@/lib/usage-store';

export async function GET() {
  return Response.json({
    latest: getLatestUsage(),
    session: getSessionUsage(),
  });
}
