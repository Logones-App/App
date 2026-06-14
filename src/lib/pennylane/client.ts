const PENNYLANE_BASE = "https://app.pennylane.com/api/external/v2";

function headers() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.PENNYLANE_API_TOKEN}`,
  };
}

export async function pennylanePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${PENNYLANE_BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pennylane POST ${path} ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function pennylaneGet<T>(path: string): Promise<T> {
  const res = await fetch(`${PENNYLANE_BASE}${path}`, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pennylane GET ${path} ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export function vatCode(rate: number): string {
  if (rate >= 20) return "FR_200";
  if (rate >= 10) return "FR_100";
  if (rate >= 5) return "FR_055";
  return "FR_000";
}
