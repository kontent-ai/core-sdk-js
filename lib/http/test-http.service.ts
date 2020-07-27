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

    constructor(config: {
        fakeStatusCode?: number;
        fakeResponseJson?: any;
        throwError?: boolean;
        errorJson?: any;
        fakeHeaders?: IHeader[];
    }) {
        Object.assign(this, config);
    }

    get<TError extends any, TRawData extends any>(
        call: IHttpGetQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
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

    post<TError extends any, TRawData extends any>(
        call: IHttpPostQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
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

    put<TError extends any, TRawData extends any>(
        call: IHttpPutQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
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

    patch<TError extends any, TRawData extends any>(
        call: IHttpPatchQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
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

    delete<TError extends any, TRawData extends any>(
        call: IHttpDeleteQueryCall<TError>,
        options?: IHttpQueryOptions
    ): Observable<IBaseResponse<TRawData>> {
        // throw kontent error
        if (this.throwError) {
            const fakeError = {
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
