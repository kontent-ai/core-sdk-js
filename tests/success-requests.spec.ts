import { describe, expect, it } from 'vitest';
import { defaultHttpService } from '../lib/http/http.service.js';

describe('Success requests', async () => {
    const postId = 1;

    const response = await defaultHttpService.getAsync<{
        readonly id: number;
    }>(`https://jsonplaceholder.typicode.com/posts/${postId}`);

    it('Status should be 200', () => {
        expect(response.status).toStrictEqual(200);
    });

    it(`Post id should be ${postId}`, () => {
        expect(response.data.id).toStrictEqual(postId);
    });

    it('Response should contain headers', () => {
        expect(response.responseHeaders.length).toBeGreaterThan(0);
    });

    it('Response should contain application/json content type header', () => {
        expect(response.responseHeaders.find((m) => m.header.toLowerCase() === 'content-type')?.value).toStrictEqual(
            'application/json; charset=utf-8'
        );
    });

    it('Status should be 200', () => {
        expect(response.status).toStrictEqual(200);
    });
});
