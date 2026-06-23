const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const isClient = typeof window !== "undefined";

function getHeaders(customHeaders: HeadersInit = {}, isMultipart: boolean = false): HeadersInit {
  const headers: Record<string, string> = {};
  
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  
  if (isClient) {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return {
    ...headers,
    ...customHeaders,
  };
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    if (isClient) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    throw new ApiError(401, "No autorizado");
  }

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      // keep default detail
    }
    throw new ApiError(response.status, detail);
  }
  return response.json() as Promise<T>;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: getHeaders(options.headers),
  });
  return handleResponse<T>(response);
}

export async function apiUpload<T>(
  endpoint: string,
  file: File,
  additionalFields?: Record<string, string>
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const formData = new FormData();
  formData.append("file", file);

  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const response = await fetch(url, {
    method: "POST",
    body: formData,
    headers: getHeaders({}, true),
  });
  return handleResponse<T>(response);
}

export async function apiDelete<T = void>(endpoint: string): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (response.status === 204) {
    return undefined as T;
  }
  return handleResponse<T>(response);
}
