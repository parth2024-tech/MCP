# Native Data Fetching — Code Reference

## ## References

```

## When to Use
Use this skill when:

- Implementing API requests
- Setting up data fetching (React Query, SWR)
- Using Expo Router data loaders (`useLoaderData`, web SDK 55+)
- Debugging network failures
- Implementing caching strategies
- Handling offline scenarios
- Authentication/token management
- Configuring API URLs and environment variables

## Preferences

- Avoid axios, prefer expo/fetch

## Common Issues & Solutions

### 1. Basic Fetch Usage

**Simple GET request**:

```tsx


## ### 2. React Query (TanStack Query)

```tsx
// app/_layout.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
    </QueryClientProvider>
  );
}
```


```tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateUserForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const handleSubmit = (data: UserData) => {
    mutation.mutate(data);
  };

  return <Form onSubmit={handleSubmit} isLoading={mutation.isPending} />;
}
```


## ### 3. Error Handling

```tsx
class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

const fetchWithErrorHandling = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(
        error.message || "Request failed",
        response.status,
        error.code
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error (no internet, timeout, etc.)
    throw new ApiError("Network error", 0, "NETWORK_ERROR");
  }
};
```


## ### 4. Authentication

```tsx
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

export const auth = {
  getToken: () => SecureStore.getItemAsync(TOKEN_KEY),
  setToken: (token: string) => SecureStore.setItemAsync(TOKEN_KEY, token),
  removeToken: () => SecureStore.deleteItemAsync(TOKEN_KEY),
};

// Authenticated fetch wrapper
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = await auth.getToken();

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
};
```


```tsx
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

const getValidToken = async (): Promise<string> => {
  const token = await auth.getToken();

  if (!token || isTokenExpired(token)) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }
    return refreshPromise!;
  }

  return token;
};
```


## ### 6. Environment Variables

```tsx
// api/client.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not defined");
}

export const apiClient = {
  get: async <T,>(path: string): Promise<T> => {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },

  post: async <T,>(path: string, body: unknown): Promise<T> => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  },
};
```


## ## Decision Tree

```
User asks about networking
  |-- Route-level data loading (web, SDK 55+)?
  |   \-- Expo Router loaders — see references/expo-router-loaders.md
  |
  |-- Basic fetch?
  |   \-- Use fetch API with error handling
  |
  |-- Need caching/state management?
  |   |-- Complex app -> React Query (TanStack Query)
  |   \-- Simpler needs -> SWR or custom hooks
  |
  |-- Authentication?
  |   |-- Token storage -> expo-secure-store
  |   \-- Token refresh -> Implement refresh flow
  |
  |-- Error handling?
  |   |-- Network errors -> Check connectivity first
  |   |-- HTTP errors -> Parse response, throw typed errors
  |   \-- Retries -> Exponential backoff
  |
  |-- Offline support?
  |   |-- Check status -> NetInfo
  |   \-- Queue requests -> React Query persistence
  |
  |-- Environment/API config?
  |   |-- Client-side URLs -> EXPO_PUBLIC_ prefix in .env
  |   |-- Server secrets -> Non-prefixed env vars (API routes only)
  |   \-- Multiple environments -> .env.development, .env.production
  |
  \-- Performance?
      |-- Caching -> React Query with staleTime
      |-- Deduplication -> React Query handles this
      \-- Cancellation -> AbortController or React Query
```


## ## Common Mistakes

```

## Example Invocations

User: "How do I make API calls in React Native?"
-> Use fetch, wrap with error handling

User: "Should I use React Query or SWR?"
-> React Query for complex apps, SWR for simpler needs

User: "My app needs to work offline"
-> Use NetInfo for status, React Query persistence for caching

User: "How do I handle authentication tokens?"
-> Store in expo-secure-store, implement refresh flow

User: "API calls are slow"
-> Check caching strategy, use React Query staleTime

User: "How do I configure different API URLs for dev and prod?"
-> Use EXPO*PUBLIC* env vars with .env.development and .env.production files

User: "Where should I put my API key?"
-> Client-safe keys: EXPO*PUBLIC* in .env. Secret keys: non-prefixed env vars in API routes only

User: "How do I load data for a page in Expo Router?"
-> See references/expo-router-loaders.md for route-level loaders (web, SDK 55+). For native, use React Query or fetch.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.


