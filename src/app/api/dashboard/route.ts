import { getDashboardSummary } from "@/lib/ledger";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const summary = await getDashboardSummary(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    return jsonOk(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
