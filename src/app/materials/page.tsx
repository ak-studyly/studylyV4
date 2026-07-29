import { createClient } from "@/lib/supabase/server";
import MaterialsClient from "./MaterialsClient";
import type { College, Material } from "@/types";

type Props = {
  searchParams: Promise<{
    collegeId?: string;
    branch?: string;
    semester?: string;
    cycle?: string;
    subject?: string;
    type?: string;
  }>;
};

export default async function MaterialsPage({ searchParams }: Props) {
  const params = await searchParams;
  const { collegeId, branch, semester, cycle, subject, type } = params;
  const supabase = await createClient();

  const { data: colleges } = await supabase
    .from("colleges")
    .select("*")
    .eq("approved", true)
    .order("name");

  let materials: Material[] = [];
  let college: College | null = null;

  if (collegeId && branch && semester) {
    const { data } = await supabase
      .from("colleges")
      .select("*")
      .eq("id", collegeId)
      .single();
    college = data;

    let q = supabase
      .from("materials")
      .select("*")
      .eq("college_id", collegeId)
      .eq("branch", branch)
      .eq("semester", parseInt(semester))
      .eq("approved", true)
      .order("upvotes", { ascending: false });

    if (cycle) q = q.or(`cycle.eq.${cycle},cycle.is.null`);
    if (subject) q = q.eq("subject", subject);
    if (type && type !== "all") q = q.eq("type", type);

    const { data: mats } = await q;
    materials = (mats as Material[]) ?? [];
  }

  return (
    <MaterialsClient
      colleges={(colleges as College[]) ?? []}
      initialMaterials={materials}
      initialCollege={college}
      initialParams={{
        collegeId: collegeId ?? "",
        branch: branch ?? "",
        semester: semester ? parseInt(semester) : 0,
        cycle: (cycle ?? "") as "chemistry" | "physics" | "",
        subject: subject ?? "",
        type: type ?? "all",
      }}
    />
  );
}
