import { NextResponse } from 'next/server';

type ProjectRecord = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

const projects = new Map<string, ProjectRecord>();

export async function GET() {
  return NextResponse.json({ projects: Array.from(projects.values()) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' && body.name ? body.name : 'Untitled Project';
  const ownerId = typeof body?.ownerId === 'string' && body.ownerId ? body.ownerId : 'local-user';

  const now = new Date().toISOString();
  const project: ProjectRecord = {
    id: crypto.randomUUID(),
    name,
    ownerId,
    createdAt: now,
    updatedAt: now
  };
  projects.set(project.id, project);
  return NextResponse.json({ project });
}

