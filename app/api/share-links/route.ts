import { NextResponse } from 'next/server';

type ShareRecord = {
  id: string;
  projectId: string;
  mode: 'view' | 'edit';
  createdAt: string;
};

const shareLinks = new Map<string, ShareRecord>();

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const projectId = typeof body?.projectId === 'string' && body.projectId ? body.projectId : 'default';
  const mode: 'view' | 'edit' = body?.mode === 'edit' ? 'edit' : 'view';

  const id = crypto.randomUUID();
  const record: ShareRecord = {
    id,
    projectId,
    mode,
    createdAt: new Date().toISOString()
  };
  shareLinks.set(id, record);

  return NextResponse.json({
    share: record,
    url: `/share/${id}`
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id || !shareLinks.has(id)) {
    return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
  }
  return NextResponse.json({ share: shareLinks.get(id) });
}

