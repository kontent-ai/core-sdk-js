const assert = require('assert');
const util = require('util');
const Lib = require('../../dist/cjs');

describe('Node execute management request - redacts authorization token on failure', () => {
    const httpService = new Lib.HttpService({logErrorsToConsole: true});

    // Distinctive made-up token so we can scan the entire error / log output for any leak
    const fakeToken = 'fake-token-123456789';
    const authorizationHeaderValue = `Bearer ${fakeToken}`;

    let error;

    // Capture everything the SDK logs, rendering non-string args the way a Node console/logger would
    // (util.inspect), so we can assert the token never reaches the output.
    const captured = [];
    const capture = (...args) => {
        captured.push(args.map((a) => (typeof a === 'string' ? a : util.inspect(a, { depth: null }))).join(' '));
    };

    before(async () => {
        const originalConsoleError = console.error;
        console.error = capture;

        try {
            await httpService.postAsync(
                {
                    url: 'https://manage.kontent.ai/v2/projects/00000000-0000-0000-0000-000000000000/items',
                    body: { name: 'test' },
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
        } finally {
            console.error = originalConsoleError;
        }
    });

    it(`Request should fail with an axios error`, () => {
        assert.ok(error, 'expected the request to fail');
        assert.strictEqual(error.isAxiosError, true);
    });

    it(`The authorization token must not appear in the logged console output`, () => {
        assert.ok(captured.length > 0, 'expected the SDK to log the failure via console.error');
        const loggedOutput = captured.join('\n');
        assert.strictEqual(loggedOutput.includes(fakeToken), false);
    });

    it(`The authorization token must not appear anywhere in the error (util.inspect)`, () => {
        const serialized = util.inspect(error, { depth: null });
        // sanity check that util.inspect actually reached the headers (so the assertion is meaningful)
        assert.strictEqual(serialized.includes('redacted'), true);
        assert.strictEqual(serialized.includes(fakeToken), false);
    });

    it(`The authorization header value should be redacted`, () => {
        assert.strictEqual(error.config.headers['Authorization'], 'redacted');
    });
});
