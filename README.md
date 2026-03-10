[![npm version](https://badge.fury.io/js//%40kontent-ai%2Fcore-sdk.svg)](https://www.npmjs.com/package/@kontent-ai/core-sdk)
[![Build](https://github.com/kontent-ai/core-sdk-js/actions/workflows/build.yml/badge.svg)](https://github.com/kontent-ai/core-sdk-js/actions/workflows/build.yml)
[![Unit Tests](https://github.com/kontent-ai/core-sdk-js/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/kontent-ai/core-sdk-js/actions/workflows/unit-tests.yml)
[![Integration Tests](https://github.com/kontent-ai/core-sdk-js/actions/workflows/integration-tests.yml/badge.svg)](https://github.com/kontent-ai/core-sdk-js/actions/workflows/integration-tests.yml)
[![npm](https://img.shields.io/npm/dt/@kontent-ai/core-sdk.svg)](https://www.npmjs.com/package/@kontent-ai/core-sdk)
[![Known Vulnerabilities](https://snyk.io/test/github/Kontent-ai/core-sdk-js/badge.svg)](https://snyk.io/test/github/kontent-ai/core-sdk-js)
[![GitHub license](https://img.shields.io/github/license/Kontent-ai/core-sdk-js.svg)](https://github.com/kontent-ai/core-sdk-js)

# Core SDK Overview

The **Core SDK** provides foundational functionality leveraged by dependent Kontent.ai SDKs, such as [`@kontent-ai/delivery-sdk`](https://www.npmjs.com/package/@kontent-ai/delivery-sdk) and [`@kontent-ai/management-sdk`](https://www.npmjs.com/package/@kontent-ai/management-sdk).

---

## HTTP Request Infrastructure

The SDK includes a default implementation of the `HttpService` and `HttpAdapter` components, which handle HTTP requests to the Kontent.ai APIs.

These implementations are designed to work out-of-the-box but are also fully customizable. Developers may replace them with custom versions to extend or override the default behavior, depending on specific application requirements.

---

## Customization Options

The `HttpService` comes with several built-in capabilities, such as:

- **Retry policies**
- **Request parsing and validation** (URL parsing, body serialization)
- **Automatic header and tracking management**
- **Kontent.ai-specific error extraction**

To customize these behaviors entirely, you can replace the `HttpService` with your own implementation.

However, if your goal is to retain the core features (e.g., retry policies, request parsing) and only swap out the underlying HTTP client, you can do so by supplying a custom `HttpAdapter` to the `getDefaultHttpService` method.

---

## Example: Custom `HttpAdapter` Implementation

Below is an example demonstrating how to provide your own HTTP client by implementing a custom `HttpAdapter`. Both `executeRequest` and `downloadFile` are optional, so you only need to implement the methods you want to override:

```typescript
const httpService = getDefaultHttpService({
  adapter: {
    executeRequest: async (options) => {
      const response = await fetch(options.url, {
        method: options.method,
        headers: Object.fromEntries((options.requestHeaders ?? []).map((header) => [header.name, header.value])),
        body: options.body,
      });

      return {
        payload: response.headers.get("content-type")?.includes("application/json")
          ? await response.json()
          : null,
        responseHeaders: [...response.headers.entries()].map(([name, value]) => ({ name, value })),
        status: response.status,
        statusText: response.statusText,
        url: options.url,
      };
    },
    downloadFile: async (options) => {
      const response = await fetch(options.url, {
        headers: Object.fromEntries((options.requestHeaders ?? []).map((header) => [header.name, header.value])),
      });

      return {
        payload: await response.blob(),
        responseHeaders: [...response.headers.entries()].map(([name, value]) => ({ name, value })),
        status: response.status,
        statusText: response.statusText,
        url: options.url,
      };
    },
  },
});
```

This approach gives you fine-grained control over how requests are made, while still benefiting from the core service's additional functionalities.

---

## Error Handling

All operations return a discriminated `success`/`error` result — the SDK never throws. Errors are represented by `KontentSdkError`, which carries a `details` object with a `reason` discriminant that can be narrowed for type-safe handling:

```typescript
const { success, response, error } = await httpService.request({
  url: "https://manage.kontent.ai/v2/projects/...",
  method: "GET",
  body: null,
});

if (!success) {
  switch (error.details.reason) {
    case "unauthorized":
      // error.details includes: status, statusText, responseHeaders, kontentErrorResponse
      console.error("Check your API key:", error.details.kontentErrorResponse?.message);
      break;
    case "notFound":
      console.error("Resource not found:", error.url);
      break;
    case "invalidResponse":
      // Any non-2xx response that isn't 401 or 404
      console.error(`HTTP ${error.details.status}:`, error.details.kontentErrorResponse?.message);
      break;
    case "adapterError":
      // Network failure, timeout, or other transport-level issue
      console.error("Request failed:", error.details.originalError);
      break;
    case "invalidUrl":
      // The provided URL could not be parsed before the request was sent
      console.error("Invalid URL:", error.details.originalError);
      break;
    case "invalidBody":
      // The request body could not be serialized before the request was sent
      console.error("Invalid body:", error.details.originalError);
      break;
    case "validationFailed":
      // Zod schema validation failed (when responseValidation is enabled)
      console.error("Unexpected response shape for", error.details.url, error.details.zodError);
      break;
    case "noResponses":
      // Paging query completed without any responses
      console.error("No data returned for", error.details.url);
      break;
  }
  return;
}

// response is fully typed here
console.log(response.payload);
```

---

## Retry Strategy

The default `HttpService` includes configurable retry logic. HTTP 429 (rate limit) responses are always retried automatically with a delay based on the `Retry-After` header. All other HTTP error responses are not retried.

For transport-level failures (network errors, timeouts), you can control retry behavior via `canRetryAdapterError`:

```typescript
const httpService = getDefaultHttpService({
  retryStrategy: {
    maxRetries: 3,
    canRetryAdapterError: (error) => {
      // `error` is typed as KontentSdkError<ErrorDetailsFor<"adapterError">>
      // Return true to retry, false to stop
      return true;
    },
    logRetryAttempt: "logToConsole",
  },
});
```
