import { AxiosResponse } from 'axios';
import { IHeader } from '../http/http.models';

export function extractHeadersFromAxiosResponse(response: AxiosResponse): IHeader[] {
    const headers: IHeader[] = [];

    for (const headerKey of Object.keys(response.headers)) {
        headers.push({
            header: headerKey,
            value: response.headers[headerKey]
        });
    }

    return headers;
}
