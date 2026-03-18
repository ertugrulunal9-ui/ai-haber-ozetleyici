export class HttpError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    super(body.error ? String(body.error) : "request_failed");
    this.status = status;
    this.body = body;
  }
}
