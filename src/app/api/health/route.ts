import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonOk({ status: "ok", service: "finance-tracker" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { status: "error", service: "finance-tracker", error: "database_unavailable" },
      { status: 503 },
    );
  }
}
