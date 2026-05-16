export async function postJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await safeJson(response);
    throw new Error(data?.error || "Request failed");
  }

  return safeJson(response) as Promise<T>;
}

export async function patchJson<T>(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await safeJson(response);
    throw new Error(data?.error || "Request failed");
  }

  return safeJson(response) as Promise<T>;
}

export async function deleteRequest(url: string) {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const data = await safeJson(response);
    throw new Error(data?.error || "Delete failed");
  }
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
