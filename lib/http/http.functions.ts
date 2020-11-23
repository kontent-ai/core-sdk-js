import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

import { httpDebugger } from './http.debugger';
import {
    IHeader,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryOptions,
    IHttpRequestResult,
} from './http.models';

export function registerResponseInterceptor(
    instance: AxiosInstance,
    interceptor: (response: AxiosResponse<any>) => AxiosResponse<any>
) {
    instance.interceptors.response.use(
        response => {
            return interceptor(response);
        },
        error => {
            return Promise.reject(error);
        }
    );
}

export function registerRequestInterceptor(
    instance: AxiosInstance,
    interceptor: (config: AxiosRequestConfig) => AxiosRequestConfig
) {
    // Add a request interceptor
    instance.interceptors.request.use(
        config => {
            return interceptor(config);
        },
        error => {
            return Promise.reject(error);
        }
    );
}

export function getCallback(
    instance: AxiosInstance,
    call: IHttpGetQueryCall,
    options: IHttpQueryOptions | undefined
): Promise<IHttpRequestResult<AxiosResponse>> {
    httpDebugger.debugStartHttpRequest();

    const axiosPromise = instance.get(call.url, {
        headers: getHeadersJson(options && options.headers ? options.headers : [], false),
        responseType: options && options.responseType ? options.responseType : undefined
    });

    return mapRequestResult(axiosPromise);
}

export function putCallback(
    instance: AxiosInstance,
    call: IHttpPutQueryCall,
    options: IHttpQueryOptions | undefined
): Promise<IHttpRequestResult<AxiosResponse>> {
    httpDebugger.debugStartHttpRequest();

    const axiosPromise = instance.put(call.url, call.body, {
        headers: getHeadersJson(options && options.headers ? options.headers : [], true),
        responseType: options && options.responseType ? options.responseType : undefined
    });

    return mapRequestResult(axiosPromise);
}

export function patchCallback(
    instance: AxiosInstance,
    call: IHttpPatchQueryCall,
    options: IHttpQueryOptions | undefined
): Promise<IHttpRequestResult<AxiosResponse>> {
    httpDebugger.debugStartHttpRequest();

    const axiosPromise = instance.patch(call.url, call.body, {
        headers: getHeadersJson(options && options.headers ? options.headers : [], true),
        responseType: options && options.responseType ? options.responseType : undefined
    });

    return mapRequestResult(axiosPromise);
}

export function deleteCallback(
    instance: AxiosInstance,
    call: IHttpDeleteQueryCall,
    options: IHttpQueryOptions | undefined
): Promise<IHttpRequestResult<AxiosResponse>> {
    httpDebugger.debugStartHttpRequest();

    const axiosPromise = instance.delete(call.url, {
        headers: getHeadersJson(options && options.headers ? options.headers : [], true),
        responseType: options && options.responseType ? options.responseType : undefined
    });

    return mapRequestResult(axiosPromise);
}

export function postCallback(
    instance: AxiosInstance,
    call: IHttpPostQueryCall,
    options: IHttpQueryOptions | undefined
): Promise<IHttpRequestResult<AxiosResponse>> {
    httpDebugger.debugStartHttpRequest();

    const axiosPromise = instance.post(call.url, call.body, {
        headers: getHeadersJson(options && options.headers ? options.headers : [], true),
        responseType: options && options.responseType ? options.responseType : undefined
    });

    return mapRequestResult(axiosPromise);
}

function getHeadersJson(headers: IHeader[], addContentTypeHeader: boolean): { [header: string]: string } {
    const headerJson: { [header: string]: string } = {};

    headers.forEach(header => {
        headerJson[header.header] = header.value;
    });

    if (addContentTypeHeader) {
        // add default content type header if not present
        const contentTypeHeader = headers.find(m => m.header.toLowerCase() === 'Content-Type'.toLowerCase());

        if (!contentTypeHeader) {
            headerJson['Content-Type'] = 'application/json';
        }
    }

    return headerJson;
}

function mapRequestResult(promise: Promise<AxiosResponse<any>>): Promise<IHttpRequestResult<AxiosResponse>> {
    return promise.then(response => {
        httpDebugger.debugResolveHttpRequest();
        return <IHttpRequestResult<AxiosResponse>>{
            response: response
        };
    },
    error => {
        httpDebugger.debugFailedHttpRequest();
        return <IHttpRequestResult<AxiosResponse>>{
            error: error
        };
    });
}
