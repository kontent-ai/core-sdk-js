import { IQueryParameter, urlHelper } from '../../../lib';

describe('Default retry strategy verification', () => {

    it(`Verified default parameters`, () => {
        const params: IQueryParameter[] = [
            {
                getParam: () => 'x=1'
            },
            {
                getParam: () => 'y=2'
            },
            {
                getParam: () => 'k'
            },
        ];

        expect(urlHelper.addOptionsToUrl('https://domain.com', params)).toEqual('https://domain.com?x=1&y=2&k');
        expect(urlHelper.addOptionsToUrl('https://domain.com?z=3', params)).toEqual('https://domain.com?z=3&x=1&y=2&k');
    });
});
