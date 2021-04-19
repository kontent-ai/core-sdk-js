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
    public response?: IResponse<any> = undefined;
    public error?: any = undefined;

    constructor(config: { response?: IResponse<any>; error?: any }) {
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
            if (this.error) {
                reject(this.error);
            }

            throw Error(`Missing test data`);
        });
        return promise;
    }
}
