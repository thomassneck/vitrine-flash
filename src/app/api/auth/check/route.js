import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  
  const cookieStore = await cookies();
  const session = cookieStore.get(`admin_session_${slug}`);

  return NextResponse.json({ autorise: Boolean(session?.value) });
}