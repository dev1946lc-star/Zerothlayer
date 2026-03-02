import { NextResponse } from 'next/server';

type Snapshot = {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  payload: unknown;
};

const snapshotsStore = new Map<string, Snapshot[]>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId') || 'default';
  const snapshots = snapshotsStore.get(projectId) || [];
  return NextResponse.json({ snapshots });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const projectId = typeof body?.projectId === 'string' ? body.projectId : 'default';
  const name = typeof body?.name === 'string' && body.name ? body.name : `Snapshot ${new Date().toISOString()}`;
  const payload = body?.payload ?? {};

  const entry: Snapshot = {
    id: crypto.randomUUID(),
    projectId,
    name,
    createdAt: new Date().toISOString(),
    payload
  };

  const prev = snapshotsStore.get(projectId) || [];
  snapshotsStore.set(projectId, [entry, ...prev].slice(0, 50));
  return NextResponse.json({ snapshot: entry });
}

