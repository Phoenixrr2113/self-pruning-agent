import { countTokensExact, countTokensBatch, countTokensSync } from '@/lib/tiktoken.server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { texts } = body as { texts: string[] };

    if (!texts || !Array.isArray(texts)) {
      return Response.json(
        { error: 'texts array is required' },
        { status: 400 }
      );
    }

    const counts = await countTokensBatch(texts);
    const total = counts.reduce((sum, count) => sum + count, 0);

    return Response.json({
      counts,
      total,
    });
  } catch (error) {
    console.error('[/api/tokens] Error:', error);
    return Response.json(
      { error: 'Failed to count tokens' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');

  if (!text) {
    return Response.json(
      { error: 'text parameter is required' },
      { status: 400 }
    );
  }

  // Use sync version for GET to avoid complexity
  const count = countTokensSync(text);

  return Response.json({
    count,
    text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    method: 'estimation',
  });
}
