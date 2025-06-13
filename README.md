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
- **Request validation**
- **Automatic header and tracking management**
- **Kontent.ai-specific error extraction**

To customize these behaviors entirely, you can replace the `HttpService` with your own implementation.

However, if your goal is to retain the core features (e.g., retry policies, request validation) and only swap out the underlying HTTP client, you can do so by supplying a custom `HttpAdapter` to the `getDefaultHttpService` method.

---

## Example: Custom `HttpAdapter` Implementation

Below is an example demonstrating how to provide your own HTTP client by implementing a custom `HttpAdapter`:

```typescript
const httpService = await getDefaultHttpService({
  adapter: {
    requestAsync: async (options) => {
      // Execute the request using your custom HTTP client
      return {
        isValidResponse: <true | false>,
        responseHeaders: <arrayOfHeaders>,
        status: <statusCode>,
        statusText: <statusText>,
        toJsonAsync: async () => <responseInJson>,
        toBlobAsync: async () => <responseInBlob>,
      };
    },
  },
});
```

This approach gives you fine-grained control over how requests are made, while still benefiting from the core service's additional functionalities.
