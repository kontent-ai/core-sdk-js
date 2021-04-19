import { getDeltabackoffTotalTime } from '../../shared/test.shared';
import { HttpService, httpDebugger } from '../../../lib';

describe('Execute get request - fail', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;

    const httpService = new HttpService();
    let error: any;
    const deltaBackoffMs: number = 500;
    const retryAttempts: number = 3;

    const cumulativeWaitTimeMin: number = getDeltabackoffTotalTime(retryAttempts, deltaBackoffMs);
    const cumulativeWaitTimeMax: number = cumulativeWaitTimeMin + 6000; // add seconds as a buffer for handling http requests

    let executionTime: number = 0;

    beforeAll(async () => {
        spyOn(httpDebugger, 'debugStartHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugSuccessHttpRequest').and.callThrough();
        spyOn(httpDebugger, 'debugRetryHttpRequest').and.callThrough();

        const timerA = performance.now();

        try {
            await httpService.getAsync(
                {
                    url: 'https://deliver.kontent.ai/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior-invalid'
                },
                {
                    retryStrategy: {
                        maxAttempts: retryAttempts,
                        addJitter: false,
                        canRetryError: (err) => true,
                        deltaBackoffMs: deltaBackoffMs
                    }
                }
            );
        } catch (err) {
            error = err;
        }

        const timerB = performance.now();
        executionTime = timerB - timerA;
    });

    it(`Error should preserve error message`, () => {
        expect(error.toString()).toContain('Request failed with status code 404');
    });

    it(`Request should success and debug methods called`, () => {
        expect(httpDebugger.debugSuccessHttpRequest).toHaveBeenCalledTimes(0);
        expect(httpDebugger.debugStartHttpRequest).toHaveBeenCalledTimes(retryAttempts + 1);
        expect(httpDebugger.debugRetryHttpRequest).toHaveBeenCalledTimes(retryAttempts);
    });

    it(`Retry wait time should be between '${cumulativeWaitTimeMin}' and '${cumulativeWaitTimeMax}' ms `, () => {
        expect(executionTime).toBeGreaterThan(cumulativeWaitTimeMin);
        expect(executionTime).toBeLessThan(cumulativeWaitTimeMax);
    });
});
