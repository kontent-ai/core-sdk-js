const assert = require('assert');
const Lib = require('../../_commonjs');

describe('Promise execution under node.js', () => {

    const httpService = new Lib.HttpService();
    let response = null;

    before((done) => {
        httpService.get({
            url: 'https://deliver.kontent.ai/da5abe9f-fdad-4168-97cd-b3464be2ccb9/items/warrior'
        })  .subscribe(result => {
            response = result;
            done();
        });
    });

    it('Response is set', () => {
        assert.notEqual(response, null);
        assert.equal(response.status, 200);
        assert.equal(response.headers.length > 0, true);
    });

    it('Item in response is available', () => {
        const itemCodename = response.data.item.system.codename;
        const expectedCodename = 'warrior';

        assert.equal(itemCodename, expectedCodename);
    });

    it('X-Stale-Content is available under node', () => {
        const staleContentHeader = response.headers.find(m => m.header.toLowerCase() === 'x-stale-content'.toLowerCase());
        assert.notEqual(staleContentHeader, null);
    });

});


