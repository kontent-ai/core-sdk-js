const assert = require('assert');
const Lib = require('../../dist/cjs');

describe('Node execute management request - redacts authorization token on connection failure', () => {
    const httpService = new Lib.HttpService();

    // Distinctive made-up token so we can scan the entire error for any leak
    const fakeToken = 'fake-token-123456789';
    const authorizationHeaderValue = `Bearer ${fakeToken}`;

    let error;

    before(async () => {
        try {
            await httpService.postAsync(
                {
                    // nothing listens on port 1 - the request fails at the transport level
                    // (connection refused), never reaching a server that could respond
                    url: 'http://127.0.0.1:1/v2/projects/00000000-0000-0000-0000-000000000000/items',
                    body: { name: 'test' }
                },
                {
                    headers: [{ header: 'Authorization', value: authorizationHeaderValue }],
                    retryStrategy: {
                        maxAttempts: 0,
                        addJitter: false,
                        deltaBackoffMs: 1
                    }
                }
            );
        } catch (err) {
            error = err;
        }
    });

    it(`Request should fail with an axios error`, () => {
        assert.ok(error, 'expected the request to fail');
        assert.strictEqual(error.isAxiosError, true);
    });

    it(`The authorization token must not appear anywhere in the error`, () => {
        // Serialize EVERY property of the error (own enumerable + non-enumerable, at any depth) into
        // one string, then scan it. util.inspect is not used here because its formatting of
        // ClientRequest/Socket does not reliably surface everything (e.g. the outgoing headers kept
        // under the non-enumerable Symbol(kOutHeaders) property), which could mask a real leak.
      const serialized = serializeAllProperties(error);
        assert.strictEqual(serialized.includes(fakeToken), false);
    });

    it(`The authorization header value should be redacted`, () => {
        assert.strictEqual(error.config.headers['Authorization'], 'redacted');
    });
});

// Recursively builds a string containing every property (keys + values) of the object graph,
// including non-enumerable and symbol-keyed own props. Cycle-guarded so circular internals don't
// recurse forever. Depth cap is well beyond the production maxRedactionDepth (10) so this check is
// independent of wherever production redaction happens to stop.
function serializeAllProperties(value, seen = new WeakSet(), depth = 0) {
    if (value === null || typeof value !== 'object') {
        return String(value);
    }
    if (seen.has(value) || depth > 30) {
        return '[circular or too deep]';
    }
    seen.add(value);

    const parts = [];
    for (const key of Reflect.ownKeys(value)) {
        let propValue;
        try {
            propValue = value[key];
        } catch {
            // accessing the property threw (e.g. a getter) - skip it
            continue;
        }
        parts.push(`${String(key)}=${serializeAllProperties(propValue, seen, depth + 1)}`);
    }
    return `{${parts.join(',')}}`;
}
