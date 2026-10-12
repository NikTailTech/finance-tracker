import { faviconSvg, isHexColor } from "@/lib/appearance";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const color = searchParams.get("color") ?? "#3dba7e";
  const safeColor = isHexColor(color) ? color : "#3dba7e";
  return new Response(faviconSvg(safeColor), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
