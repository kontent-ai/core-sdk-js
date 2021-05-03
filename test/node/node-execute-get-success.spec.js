const assert = require('assert');
const Lib = require('../../dist/cjs');

describe('Node execute get request - success', () => {

    const httpService = new Lib.HttpService();
    let response = null;

    before(async () => {
        response = await httpService.getAsync({
            url: 'https://deliver.kontent.ai/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior'
        });
    });

    it('Response is set', () => {
        assert.notStrictEqual(response, null);
        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.headers.length > 0, true);
    });

    it('Item in response is available', () => {
        const itemCodename = response.data.item.system.codename;
        const expectedCodename = 'warrior';

        assert.strictEqual(itemCodename, expectedCodename);
    });

    it('X-Stale-Content is available under node', () => {
        const staleContentHeader = response.headers.find(m => m.header.toLowerCase() === 'x-stale-content'.toLowerCase());
        assert.notStrictEqual(staleContentHeader, null);
    });

});


