const assert = require('assert');
const {
    performance
} = require('perf_hooks');
const Lib = require('../../dist/_commonjs');


function getDeltabackoffTotalTime(retryAttempts, deltaBackoffMs) {
    let totalTime = 0;
    let cumulativeBackoff = deltaBackoffMs;

    for (let i = 1; i <= retryAttempts; i++) {
        if (i === 1) {
            totalTime = deltaBackoffMs;
        } else {
            totalTime += cumulativeBackoff * 2;
            cumulativeBackoff = cumulativeBackoff * 2;
        }
    }

    return totalTime;
}

describe('Node execute get request - success', () => {
    const httpService = new Lib.HttpService();

    const deltaBackoffMs = 500;
    const retryAttempts = 3;

    const cumulativeWaitTimeMin = getDeltabackoffTotalTime(retryAttempts, deltaBackoffMs);
    const cumulativeWaitTimeMax = cumulativeWaitTimeMin + 6000; // add seconds as a buffer for handling http requests

    let executionTime = 0;
    let response;

    before(async () => {
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
        assert.strictEqual(error.toString().includes('Request failed with status code 404'), true);
    });

    it(`Retry wait time should be between '${cumulativeWaitTimeMin}' and '${cumulativeWaitTimeMax}' ms `, () => {

        assert.strictEqual(executionTime > cumulativeWaitTimeMin, true);
        assert.strictEqual(executionTime < cumulativeWaitTimeMax, true);
    });

});


