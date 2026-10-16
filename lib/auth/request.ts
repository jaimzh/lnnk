// Reject cross-origin browser requests before they can change authentication.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
