// This language is a fucking joke. https://stackoverflow.com/posts/76394628/revisions

type maybeByteArray = Uint8Array | undefined;

export function compareByteArrays(a: maybeByteArray, b: maybeByteArray): boolean {
    if (a === undefined || b === undefined) {
        throw new Error("a or b is undefined");
    }
    if (a.length != b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] != b[i]) return false;
    }
    return true;
}

export function calculateChecksum(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i];
    }
    console.log("checksum calculated = ", sum & 0xff);
    return sum & 0xFF;
}
export function log(message: string) {
    if (log.debugMode) {
        console.log(message);
    }
}
log.debugMode = false;