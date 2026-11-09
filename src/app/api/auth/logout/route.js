// src/app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request) {
  const { slug } = await request.json();
  const cookieStore = await cookies();
  cookieStore.delete(`admin_session_${slug}`);
  return NextResponse.json({ succes: true });
}