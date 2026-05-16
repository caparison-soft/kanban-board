/**
 * POST /api/credits/check
 * Server-side proxy to check user credits from Caparison Lab.
 * Keeps CAPARISON_API_KEY secure on the server.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { userToken } = await req.json();

    if (!userToken) {
      return NextResponse.json({ error: 'Missing userToken' }, { status: 400 });
    }

    const res = await fetch(`${process.env.CAPARISON_BASE_URL}/api/v1/credits`, {
      headers: {
        'Authorization': `Bearer ${process.env.CAPARISON_API_KEY}`,
        'X-User-Token': userToken,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[credits/check] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
