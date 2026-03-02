import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const roomId = typeof body?.roomId === 'string' && body.roomId ? body.roomId : 'default-room';
  const userName = typeof body?.userName === 'string' && body.userName ? body.userName : 'Anonymous';

  return NextResponse.json({
    roomId,
    user: {
      id: crypto.randomUUID(),
      name: userName,
      color: `hsl(${Math.floor(Math.random() * 360)} 80% 55%)`
    },
    token: Buffer.from(`${roomId}:${Date.now()}`).toString('base64')
  });
}

