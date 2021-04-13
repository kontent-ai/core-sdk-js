import { AxiosError } from 'axios';

import {
    IResponse,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryOptions
} from './http.models';
import { IHttpService } from './ihttp.service';

export class TestHttpService implements IHttpService {
    public genericError?: any;
    public response?: IResponse<any> = undefined;
    public axiosError?: AxiosError = undefined;

    constructor(config: { genericError?: any; response?: IResponse<any>; axiosError?: AxiosError }) {
        Object.assign(this, config);
    }

    getAsync<TRawData>(call: IHttpGetQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>> {
        return this.resolveTestCall();
    }

    postAsync<TRawData>(call: IHttpPostQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>> {
        return this.resolveTestCall();
    }

    putAsync<TRawData>(call: IHttpPutQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>> {
        return this.resolveTestCall();
    }

    patchAsync<TRawData>(call: IHttpPatchQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>> {
        return this.resolveTestCall();
    }

    deleteAsync<TRawData>(call: IHttpDeleteQueryCall, options?: IHttpQueryOptions): Promise<IResponse<TRawData>> {
        return this.resolveTestCall();
    }

    private resolveTestCall(): Promise<IResponse<any>> {
        const promise = new Promise<IResponse<any>>((resolve, reject) => {
            if (this.response) {
                resolve(this.response);
            }
            if (this.axiosError) {
                reject(this.axiosError);
            }
            if (this.genericError) {
                reject(this.genericError);
            }

            throw Error(`Missing test data`);
        });
        return promise;
    }
}
