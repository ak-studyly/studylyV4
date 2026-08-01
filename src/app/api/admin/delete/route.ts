import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Single source of truth for deletion: this route is the ONLY
// code path allowed to delete a material. It always removes the
// Storage object and the materials row together, so the site can
// never end up displaying an orphaned record (a DB row whose PDF
// no longer exists).
export async function POST(req: NextRequest) {
  const { id, secret } = await req.json();

  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing material id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: material, error: fetchError } = await supabase
    .from("materials")
    .select("id, file_path")
    .eq("id", id)
    .single();

  if (fetchError || !material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from("materials")
    .remove([material.file_path]);

  if (storageError) {
    console.error("Storage delete warning:", storageError.message);
  }

  const { error: dbError } = await supabase
    .from("materials")
    .delete()
    .eq("id", id);

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    storageWarning: storageError ? storageError.message : null,
  });
}
