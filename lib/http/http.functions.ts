import axios, { AxiosInstance, Canceler, CancelToken } from 'axios';
import { extractHeadersFromAxiosResponse } from '../helpers/headers-helper';

import { httpDebugger } from './http.debugger';
import {
    IHttpCancelRequestToken,
    IHeader,
    IHttpDeleteQueryCall,
    IHttpGetQueryCall,
    IHttpPatchQueryCall,
    IHttpPostQueryCall,
    IHttpPutQueryCall,
    IHttpQueryOptions,
    IResponse,
    IRetryStrategyOptions
} from './http.models';
import { retryHelper } from '../helpers/retry-helper';

export interface IHttpFunctionsConfig {
    logErrorsToConsole: boolean;
}

export async function getWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpGetQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        headers: options?.headers ?? [],
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.get<TRawData>(call.url, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function postWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPostQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        headers: options?.headers ?? [],
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.post<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function putWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPutQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        headers: options?.headers ?? [],
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.put<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function patchWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpPatchQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        headers: options?.headers ?? [],
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.patch<TRawData>(call.url, call.body, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export async function deleteWithRetryAsync<TRawData>(
    instance: AxiosInstance,
    call: IHttpDeleteQueryCall,
    functionsConfig: IHttpFunctionsConfig,
    options?: IHttpQueryOptions<CancelToken>
): Promise<IResponse<TRawData>> {
    const retryStrategyOptions = options?.retryStrategy ?? retryHelper.defaultRetryStrategy;

    return await runWithRetryAsync<TRawData>({
        retryAttempt: 0,
        url: call.url,
        retryStrategy: retryStrategyOptions,
        functionsConfig: functionsConfig,
        headers: options?.headers ?? [],
        call: async (retryAttempt) => {
            httpDebugger.debugStartHttpRequest();

            const axiosResponse = await instance.delete<TRawData>(call.url, {
                headers: getHeadersJson(options?.headers ?? [], false),
                responseType: options?.responseType,
                // required for uploading large files
                // https://github.com/axios/axios/issues/1362
                maxContentLength: 'Infinity' as any,
                maxBodyLength: 'Infinity' as any,
                cancelToken: options?.cancelToken?.token
            });

            const response: IResponse<TRawData> = {
                data: axiosResponse.data,
                rawResponse: axiosResponse,
                headers: extractHeadersFromAxiosResponse(axiosResponse),
                status: axiosResponse.status,
                retryStrategy: {
                    options: retryStrategyOptions,
                    retryAttempts: retryAttempt
                }
            };

            httpDebugger.debugSuccessHttpRequest();
            return response;
        }
    });
}

export function createCancelToken(): IHttpCancelRequestToken<CancelToken> {
    let canceler: Canceler;

    const token = new axios.CancelToken((c) => {
        // An executor function receives a cancel function as a parameter
        canceler = c;
    });

    return {
        cancel: (cancelMessage) =>
            canceler(`${retryHelper.requestCancelledMessagePrefix}: ${cancelMessage ?? 'User cancel'}`),
        token: token
    };
}

async function runWithRetryAsync<TRawData>(data: {
    url: string;
    retryAttempt: number;
    call: (retryAttempt: number) => Promise<IResponse<TRawData>>;
    retryStrategy: IRetryStrategyOptions;
    functionsConfig: IHttpFunctionsConfig;
    headers: IHeader[];
}): Promise<IResponse<TRawData>> {
    try {
        return await data.call(data.retryAttempt);
    } catch (error) {
        const retryResult = retryHelper.getRetryErrorResult({
            error: error,
            retryAttempt: data.retryAttempt,
            retryStrategy: data.retryStrategy
        });

        if (retryResult.canRetry) {
            httpDebugger.debugRetryHttpRequest();

            // wait time before retrying
            await new Promise((resolve) => setTimeout(resolve, retryResult.retryInMs));

            if (data.functionsConfig.logErrorsToConsole) {
                console.warn(
                    `Retry attempt '${data.retryAttempt + 1}' from a maximum of '${
                        retryResult.maxRetries
                    }' retries. Request url: '${data.url}'`
                );
            }

            // retry request
            return await runWithRetryAsync({
                call: data.call,
                retryStrategy: data.retryStrategy,
                retryAttempt: data.retryAttempt + 1,
                url: data.url,
                functionsConfig: data.functionsConfig,
                headers: data.headers
            });
        }

        // sanitize the error before logging / re-throwing so the authorization token is not leaked
        const sanitizedError = sanitizeError(error, data.headers);

        if (data.functionsConfig.logErrorsToConsole) {
            console.error(
                `Executing '${data.url}' failed. Request was retried '${data.retryAttempt}' times.`,
                sanitizedError
            );
        }

        throw sanitizedError;
    }
}

const redactedValue = 'redacted';
const maxRedactionDepth = 10;

/**
 * Returns the caller-supplied 'authorization' header value(s), which are the secret token(s) to
 * scrub from errors. Note: if a consumer sets the authorization token on the axios instance defaults
 * instead of passing it via 'options.headers', it is not known here and cannot be redacted.
 */
function getSecretHeaderValues(headers: IHeader[]): string[] {
    return headers
        .filter((header) => header.header.toLowerCase() === 'authorization')
        .map((header) => header.value)
        // skip empty values - splitting on an empty string would corrupt every string
        .filter((value) => typeof value === 'string' && value.length > 0);
}

function redactStringValue(value: string, secrets: string[]): string {
    let result = value;

    for (const secret of secrets) {
        if (result.includes(secret)) {
            result = result.split(secret).join(redactedValue);
        }
    }

    return result;
}

/**
 * Walks the object graph (cycle- and depth-guarded) replacing every occurrence of a secret with the
 * redacted placeholder in place.
 */
function redactSecretsInPlace(target: unknown, secrets: string[], seen: WeakSet<object>, depth: number): void {
    if (depth > maxRedactionDepth || target === null || typeof target !== 'object') {
        return;
    }

    if (seen.has(target)) {
        // break cycles (config.headers, request.socket, response.request, ...)
        return;
    }
    seen.add(target);

    const container = target as Record<PropertyKey, unknown>;

    // Reflect.ownKeys (not Object.keys) so symbol-keyed and non-enumerable properties are also
    // scrubbed - e.g. Node's ClientRequest keeps the outgoing headers (incl. the token) under the
    // Symbol(kOutHeaders) property, which Object.keys does not enumerate.
    for (const key of Reflect.ownKeys(target)) {
        let value: unknown;

        try {
            value = container[key];
        } catch {
            // accessing the property threw (e.g. a getter) - skip it
            continue;
        }

        if (typeof value === 'string') {
            const redacted = redactStringValue(value, secrets);

            if (redacted !== value) {
                try {
                    container[key] = redacted;
                } catch {
                    // property is read-only - skip it
                }
            }
        } else if (value && typeof value === 'object') {
            redactSecretsInPlace(value, secrets, seen, depth + 1);
        }
    }
}

/**
 * If 'error' is an axios error, redacts every occurrence of the caller's authorization token (taken
 * from 'headers') throughout the error, replacing it with a redacted placeholder. Non-axios errors
 * and errors with no known token are returned unchanged. This prevents the authorization token from
 * leaking via console logs or the re-thrown error. All other axios properties are preserved.
 */
function sanitizeError(error: unknown, headers: IHeader[]): unknown {
    if (!axios.isAxiosError(error)) {
        return error;
    }

    const secrets = getSecretHeaderValues(headers);
    if (secrets.length === 0) {
        return error;
    }

    redactSecretsInPlace(error, secrets, new WeakSet<object>(), 0);
    return error;
}

function getHeadersJson(headers: IHeader[], addContentTypeHeader: boolean): { [header: string]: string } {
    const headerJson: { [header: string]: string } = {};

    headers.forEach((header) => {
        headerJson[header.header] = header.value;
    });

    if (addContentTypeHeader) {
        // add default content type header if not present
        const contentTypeHeader = headers.find((m) => m.header.toLowerCase() === 'Content-Type'.toLowerCase());

        if (!contentTypeHeader) {
            headerJson['Content-Type'] = 'application/json';
        }
    }

    return headerJson;
}
