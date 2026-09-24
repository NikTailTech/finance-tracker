import { APP_ICONS, faviconSvg, isHexColor } from "@/lib/appearance";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const icon = searchParams.get("icon") ?? "piggy";
  const color = searchParams.get("color") ?? "#3dba7e";
  const safeIcon = (APP_ICONS as readonly string[]).includes(icon) ? icon : "piggy";
  const safeColor = isHexColor(color) ? color : "#3dba7e";
  return new Response(faviconSvg(safeIcon, safeColor), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store",
    },
  });
}
