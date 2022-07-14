
[![npm version](https://badge.fury.io/js/%40kentico%2Fkontent-core.svg)](https://badge.fury.io/js/%40kentico%2Fkontent-core)
[![Build & Test](https://github.com/Kentico/kontent-core-js/actions/workflows/integrate.yml/badge.svg)](https://github.com/Kentico/kontent-core-js/actions/workflows/integrate.yml)
[![npm](https://img.shields.io/npm/dt/@kontent-ai/core-sdk.svg)](https://www.npmjs.com/package/@kontent-ai/core-sdk)
[![Known Vulnerabilities](https://snyk.io/test/github/Kentico/kontent-core-js/badge.svg)](https://snyk.io/test/github/kentico/kontent-core-js)
[![GitHub license](https://img.shields.io/github/license/Kentico/kontent-core-js.svg)](https://github.com/Kentico/kontent-core-js)
[![](https://data.jsdelivr.com/v1/package/npm/@kontent-ai/core-sdk/badge)](https://www.jsdelivr.com/package/npm/@kontent-ai/core-sdk)


# Core package

This package contains core functionality used by dependant Kontent.ai SDKs such as Delivery SDK or Management SDK.

# Testing

If you want to inject testing service as an implementation of [IHttpService](lib/http/ihttp.service.ts), it is possible to use configurable [Test Http Service](lib/http/test-http.service.ts).

```js
import { TestHttpService } from '@kontent-ai/core-sdk';

const client = new /*(Delivery/Management)*/Client() {
    // ...
    httpService: new TestHttpService({
        fakeResponseJson: json,
        throwError: false
    });
}
```



