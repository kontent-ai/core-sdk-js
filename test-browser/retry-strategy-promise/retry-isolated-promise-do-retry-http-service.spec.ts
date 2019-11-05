import { HttpService, retryService } from '../../lib';

describe('Retry Promise - isolated retry through Http service', () => {
    const retryAttempts = 2;

    const MAX_SAFE_TIMEOUT = Math.pow(2, 31) - 1;
    const httpService = new HttpService();

    jasmine.DEFAULT_TIMEOUT_INTERVAL = MAX_SAFE_TIMEOUT;

    beforeAll(done => {
        spyOn(retryService, 'debugLogAttempt').and.callThrough();

        const promise = () => httpService
            .get(
                {
                    mapError: err => err,
                    url: 'https://deliver.kenticocloud.com/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior-invalid-promise'
                },
                {
                    deltaBackoffMs: 1000,
                    maxCumulativeWaitTimeMs: 4000,
                    useRetryForResponseCodes: [404],
                    addJitterToRetryAttempts: false
                }
            )
            .toPromise();


        promise().then(() => {
            throw Error(`Promise should not succeed`);
        })
        .catch(err => {
            console.error('Error: ', err);
            done();
        });
            /*
        httpService
            .retryPromise(promise, {
                deltaBackoffMs: 1000,
                maxCumulativeWaitTimeMs: 3000,
                useRetryForResponseCodes: [401],
                addJitter: false
            })
            .then(() => {
                throw Error(`Promise should not succeed`);
            })
            .catch(err => {
                console.error('Error: ', err);
                done();
            });
            */
    });

    it(`Warning for retry attempt should have been called '${retryAttempts}' times`, () => {
        expect(retryService.debugLogAttempt).toHaveBeenCalledTimes(retryAttempts);
    });
});
