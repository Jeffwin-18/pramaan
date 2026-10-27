import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/audit';
import { publicLookup } from '@/lib/verify';
export const dynamic = 'force-dynamic';
// QR target. Public by design, returns masked details only and logs each view.
export async function GET(req: Request, { params }: { params: { token: string } }) {
  const r = await publicLookup(params.token, clientIp(req));
  return r ? NextResponse.json(r) : NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
}
