import { HttpError } from "./errors.ts";
import { isAllowedOrigin } from "./response.ts";

export function verifyRequestSignature(
  req: Request,
  _rawBody: string,
): string {
  const origin = req.headers.get("origin")?.trim() ?? "";
  if (!origin || !isAllowedOrigin(origin)) {
    throw new HttpError(401, { error: "unauthorized" });
  }

  const authHeader = req.headers.get("authorization")?.trim() ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() ?? "";

  if (!token) {
    throw new HttpError(401, { error: "unauthorized" });
  }

  return token;
}
