import { IResponse, TestHttpService } from '../../../lib';

describe('Test http service - fail empty url', async () => {
    const responseJsonData: any = {
        customData: true
    };

    const inputResponse: IResponse<any> = {
        data: responseJsonData,
        headers: [],
        rawResponse: {},
        status: 200,
        retryStrategy: {
            options: {},
            retryAttempts: 0
        }
    };

    const httpService = new TestHttpService({
        response: inputResponse
    });

    let response: IResponse<any>;

    beforeAll(async () => {
        response = await httpService.getAsync({
            url: ''
        });
    });

    it(`Custom response should be identical`, () => {
        expect(response).toEqual(inputResponse);
    });
});

