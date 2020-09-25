import { Observable, of, throwError } from 'rxjs';

import {
    IBaseResponse,
    IHeader,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryOptions,
} from './http.models';
import { IHttpService } from './ihttp.service';

export class TestHttpService implements IHttpService {
    public throwError: boolean = false;
    public fakeResponseJson: any = undefined;
    public errorJson: any = undefined;
    public fakeHeaders: IHeader[] = [];
    public fakeStatusCode: number = 200;
    public isAxiosError?: boolean = false;

    constructor(config: {
        fakeStatusCode?: number;
        fakeResponseJson?: any;
        throwError?: boolean;
        isAxiosError?: boolean;
        errorJson?: any;
        fakeHeaders?: IHeader[];
    }) {
        Object.assign(this, config);
    }

    get<TRawData extends any>(
        call: IHttpGetQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
                isAxiosError: this.isAxiosError,
                response: {
                    data: this.errorJson
                }
            };
            return throwError({
                error: fakeError,
                headers: this.fakeHeaders,
                status: this.fakeStatusCode
            });
        }

        // return fake response
        return of(<IBaseResponse<TRawData>>{
            data: this.fakeResponseJson,
            response: undefined,
            headers: this.fakeHeaders,
            status: this.fakeStatusCode
        });
    }

    post<TRawData extends any>(
        call: IHttpPostQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
                isAxiosError: this.isAxiosError,
                response: {
                    data: this.errorJson
                }
            };
            return throwError({
                error: fakeError,
                headers: this.fakeHeaders,
                status: this.fakeStatusCode
            });
        }

        // return fake response
        return of(<IBaseResponse<TRawData>>{
            data: this.fakeResponseJson,
            response: undefined,
            headers: this.fakeHeaders,
            status: this.fakeStatusCode
        });
    }

    put<TRawData extends any>(
        call: IHttpPutQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
                isAxiosError: this.isAxiosError,
                response: {
                    data: this.errorJson
                }
            };
            return throwError({
                error: fakeError,
                headers: this.fakeHeaders,
                status: this.fakeStatusCode
            });
        }

        // return fake response
        return of(<IBaseResponse<TRawData>>{
            data: this.fakeResponseJson,
            response: undefined,
            headers: this.fakeHeaders,
            status: this.fakeStatusCode
        });
    }

    patch<TRawData extends any>(
        call: IHttpPatchQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
                isAxiosError: this.isAxiosError,
                response: {
                    data: this.errorJson
                }
            };
            return throwError({
                error: fakeError,
                headers: this.fakeHeaders,
                status: this.fakeStatusCode
            });
        }

        // return fake response
        return of(<IBaseResponse<TRawData>>{
            data: this.fakeResponseJson,
            response: undefined,
            headers: [],
            status: this.fakeStatusCode
        });
    }

    delete<TRawData extends any>(
        call: IHttpDeleteQueryCall,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
                isAxiosError: this.isAxiosError,
                response: {
                    data: this.errorJson
                }
            };
            return throwError({
                error: fakeError,
                headers: this.fakeHeaders,
                status: this.fakeStatusCode
            });
        }

        // return fake response
        return of(<IBaseResponse<TRawData>>{
            data: this.fakeResponseJson,
            response: undefined,
            headers: this.fakeHeaders,
            status: this.fakeStatusCode
        });
    }
}
