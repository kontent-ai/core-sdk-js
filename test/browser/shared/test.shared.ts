export function getDeltabackoffTotalTime(retryAttempts: number, deltaBackoffMs: number): number {
    let totalTime: number = 0;
    let cumulativeBackoff: number = deltaBackoffMs;

    for (let i = 1; i <= retryAttempts; i++) {
        if (i === 1) {
            totalTime = deltaBackoffMs;
        } else {
            totalTime += cumulativeBackoff * 2;
            cumulativeBackoff = cumulativeBackoff * 2;
        }
    }

    return totalTime;
}
