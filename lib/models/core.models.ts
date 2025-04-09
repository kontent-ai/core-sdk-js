/**
 * SDK info for identification of the SDK
 */
export type SDKInfo = {
    readonly name: string;
    readonly version: string;
    readonly host: string;
};

export type Header = {
    readonly header: LiteralUnion<'Retry-After' | 'X-KC-SDKID'>;
    readonly value: string;
};

export type RetryStrategyOptions = {
    readonly maxAttempts?: number;
    readonly canRetryError?: (error: unknown) => boolean;
    readonly delayBetweenAttemptsMs?: number;
    readonly logRetryAttempt?: false | ((retryAttempt: number, url: string) => void);
};

/**
 * Adds intellisense for string union type, but also allows any string
 */
export type LiteralUnion<T extends string | undefined> = T | (string & NonNullable<unknown>);
