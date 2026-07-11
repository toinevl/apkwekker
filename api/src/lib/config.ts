export function baseUrl(): string {
  return process.env.BASE_URL || "http://localhost:7071";
}

export function frontendUrl(): string {
  return process.env.FRONTEND_URL || "http://localhost:5173";
}
