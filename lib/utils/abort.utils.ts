import { abortEventName } from "./core.utils.js";

type AbortResult<TData> =
	| {
			readonly isAborted: false;
			readonly data: TData;
	  }
	| {
			readonly isAborted: true;
			readonly data?: never;
	  };

export async function runWithAbortSignal<T>({
	func,
	abortSignal,
}: {
	readonly func: () => Promise<T>;
	readonly abortSignal: AbortSignal;
}): Promise<AbortResult<T>> {
	if (abortSignal.aborted) {
		return {
			isAborted: true,
		};
	}

	return await new Promise<AbortResult<T>>((resolve, reject) => {
		const onAbort = () => {
			resolve({ isAborted: true });
		};
		abortSignal.addEventListener(abortEventName, onAbort, { once: true });

		// errors of func are forwarded as is; the listener is removed once func settles
		func()
			.then((data) => {
				resolve({ isAborted: false, data });
			}, reject)
			.finally(() => {
				abortSignal.removeEventListener(abortEventName, onAbort);
			});
	});
}
