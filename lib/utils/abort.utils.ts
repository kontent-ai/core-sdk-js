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

	const listenerName = "abort";

	return await new Promise<AbortResult<T>>((resolve) => {
		const onAbort = () => {
			cleanup();
			resolve({ isAborted: true });
		};
		const cleanup = () => {
			abortSignal.removeEventListener(listenerName, onAbort);
		};
		abortSignal.addEventListener(listenerName, onAbort);

		func()
			.then((result) => {
				resolve({ isAborted: false, data: result });
			})
			.catch(() => {
				resolve({ isAborted: true });
			})
			.finally(() => {
				cleanup();
			});
	});
}
