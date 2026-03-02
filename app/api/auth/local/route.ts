import { NextResponse } from 'next/server';

type LocalUser = {
  id: string;
  name: string;
  email?: string;
};

const users = new Map<string, LocalUser>();

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : 'Guest User';
  const email = typeof body?.email === 'string' && body.email.trim() ? body.email.trim() : undefined;

  const user: LocalUser = {
    id: crypto.randomUUID(),
    name,
    email
  };
  users.set(user.id, user);
  return NextResponse.json({ user });
}

