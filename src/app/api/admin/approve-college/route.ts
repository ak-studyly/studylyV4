import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const { id, approved, secret } = await req.json();

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing college id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("colleges")
    .update({ approved: !!approved })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
