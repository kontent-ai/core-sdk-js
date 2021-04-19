import { TestHttpService } from '../../lib';

describe('Test http service - success', () => {
    const inputError: Error = {
        message: 'Internal error',
        name: 'Custom error'
    };

    let resultError: any;

    const httpService = new TestHttpService({
        error: inputError
    });

    beforeAll(async () => {
        try {
            await httpService.getAsync({
                url: ''
            });
        } catch (error) {
            resultError = error;
        }
    });

    it(`Error should be identical`, () => {
        expect(resultError).toEqual(inputError);
    });
});
