import { handleConvert } from "../_shared/convert-handler";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handleConvert(req, "word-to-pdf");
}
