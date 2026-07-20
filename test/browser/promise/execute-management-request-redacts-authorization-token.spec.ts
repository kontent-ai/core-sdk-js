import { HttpService } from '../../../lib';

describe('Execute management request - redacts authorization token on failure', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

    const httpService = new HttpService();
    // Distinctive made-up token so we can scan the entire error for any leak
    const fakeToken = 'fake-token-that-should-not-be-leaked';
    const authorizationHeaderValue = `Bearer ${fakeToken}`;

    let error: any;

    beforeAll(async () => {
        try {
            await httpService.postAsync(
                {
                    url: 'https://manage.kontent.ai/v2/projects/00000000-0000-0000-0000-000000000000/items',
                    body: { name: 'redaction-test' }
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
        // axios errors have circular refs (config.headers, request, ...); error.toJSON() returns a
        // plain, serializable view (includes message, config, code, status) so JSON.stringify is safe
        const serialized = JSON.stringify(error.toJSON());
        expect(serialized).not.toContain(fakeToken);
    });

    it(`The authorization header value should be redacted`, () => {
        expect(error.config.headers['Authorization']).toBe('redacted');
    });
});
