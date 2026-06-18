import { NextRequest, NextResponse } from "next/server";
import { consolidateScope } from "@/lib/ai/memory-ops";

export async function POST(req: NextRequest) {
  const { teamId, huddleId, scope } = await req.json();
  if (!teamId || !huddleId || (scope !== "huddle" && scope !== "team")) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const result = await consolidateScope(teamId, huddleId, scope);
  return NextResponse.json(result);
}
