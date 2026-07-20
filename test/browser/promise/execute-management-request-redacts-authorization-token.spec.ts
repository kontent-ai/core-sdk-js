import { HttpService } from '../../../lib';

describe('Execute management request - redacts authorization token on failure', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

    const httpService = new HttpService();
    // Distinctive made-up token so we can scan the entire error for any leak
    const fakeToken = 'fake-token-123456789';
    const authorizationHeaderValue = `Bearer ${fakeToken}`;

    let error: any;

    beforeAll(async () => {
        try {
            await httpService.postAsync(
                {
                    url: 'https://manage.kontent.ai/v2/projects/00000000-0000-0000-0000-000000000000/items',
                    body: { name: 'test' }
                },
                {
                    headers: [{ header: 'Authorization', value: authorizationHeaderValue }],
                    retryStrategy: {
                        maxAttempts: 0,
                        addJitter: false,
                        deltaBackoffMs: 100
                    }
                }
            );
        } catch (err) {
            error = err;
        }
    });

    it(`Request should fail with an axios error`, () => {
        expect(error).toBeDefined();
        expect(error.isAxiosError).toBe(true);
    });

    it(`The authorization token must not appear anywhere in the error`, () => {
        // Serialize EVERY property of the error (own enumerable + non-enumerable, at any depth) into
        // one string, then scan it. This is stronger than JSON.stringify / error.toJSON(), which
        // omit non-enumerable props (stack), the 'request'/'_header', and vary by serializer.
        const serialized = serializeAllProperties(error);
        expect(serialized).not.toContain(fakeToken);
    });

    it(`The authorization header value should be redacted`, () => {
        expect(error.config.headers['Authorization']).toBe('redacted');
    });
});

// Recursively builds a string containing every property (keys + values) of the object graph,
// including non-enumerable and symbol-keyed own props (message, stack, Symbol(kOutHeaders), ...).
// Cycle-guarded so circular internals (config.headers, request, cause, ...) don't recurse forever.
function serializeAllProperties(value: unknown, seen = new WeakSet<object>(), depth = 0): string {
    if (value === null || typeof value !== 'object') {
        return String(value);
    }
    if (seen.has(value) || depth > 100) {
        return '[circular]';
    }
    seen.add(value);

    const container = value as Record<PropertyKey, unknown>;
    const parts: string[] = [];
    for (const key of Reflect.ownKeys(value)) {
        let propValue: unknown;
        try {
            propValue = container[key];
        } catch {
            // accessing the property threw (e.g. XMLHttpRequest.responseText in wrong state) - skip it
            continue;
        }
        parts.push(`${String(key)}=${serializeAllProperties(propValue, seen, depth + 1)}`);
    }
    return `{${parts.join(',')}}`;
}
