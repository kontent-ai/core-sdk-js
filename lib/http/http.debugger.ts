export class HttpDebugger {
    /*
    Called when http request is started
    */
    debugStartHttpRequest(): void {
    }

    /*
    Called when http request is resolved
    */
    debugSuccessHttpRequest(): void {
    }

    /*
    Called when http request is being retried
    */
    debugRetryHttpRequest(): void {
    }
}

export const httpDebugger = new HttpDebugger();
