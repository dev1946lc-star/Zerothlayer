import { NextResponse } from 'next/server';

type ProjectDoc = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  payload?: unknown;
};

const projectDocs = new Map<string, ProjectDoc>();

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const project = projectDocs.get(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  return NextResponse.json({ project });
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const now = new Date().toISOString();
  const existing = projectDocs.get(id);

  const updated: ProjectDoc = {
    id,
    name: typeof body?.name === 'string' ? body.name : existing?.name || 'Untitled Project',
    ownerId: typeof body?.ownerId === 'string' ? body.ownerId : existing?.ownerId || 'local-user',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    payload: body?.payload ?? existing?.payload
  };
  projectDocs.set(id, updated);
  return NextResponse.json({ project: updated });
}

