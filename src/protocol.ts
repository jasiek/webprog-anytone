import { log, compareByteArrays, calculateChecksum } from "./utils";

// This value was established experimentally, and is suitable for running it from the command line at a baud rate of 921600
const SHORT_SLEEP_TIME = 15;
const LONG_SLEEP_TIME = 1000;

export class Anytone878UVProtocol {
    static readonly CMD_PROGRAM_MODE = new Uint8Array(Buffer.from("PROGRAM"));
    static readonly ENTER_PROGRAM_MODE_ACK = new Uint8Array(Buffer.from("QX\x06"));

    static readonly CMD_EXIT_PROGRAM_MODE = new Uint8Array(Buffer.from("END"));
    static readonly GENERIC_ACK = new Uint8Array(Buffer.from("\x06"));

    static readonly CMD_IDENTIFY = new Uint8Array(Buffer.from("\x02"));
    static readonly CMD_READ = new Uint8Array(Buffer.from("R"));
    static readonly CMD_WRITE = new Uint8Array(Buffer.from("W"));

    readStream: ReadableStream<Uint8Array>;
    writeStream: WritableStream<Uint8Array>;

    constructor(readStream: ReadableStream<Uint8Array>, writeStream: WritableStream<Uint8Array>) {
        this.readStream = readStream;
        this.writeStream = writeStream;
    }

    async enterProgramMode(): Promise<void> {
        log("Entering program mode");
        let writer = this.writeStream.getWriter();
        await writer.write(Anytone878UVProtocol.CMD_PROGRAM_MODE);
        writer.releaseLock();
        await this.sleep(LONG_SLEEP_TIME);

        let reader = this.readStream.getReader();
        let response = await reader.read();
        reader.releaseLock();

        if (!compareByteArrays(response.value, Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK)) {
            throw new Error("Failed to enter program mode");
        }
    }

    async exitProgramMode(): Promise<void> {
        log("Exiting program mode");
        let writer = this.writeStream.getWriter();
        await writer.write(Anytone878UVProtocol.CMD_EXIT_PROGRAM_MODE);
        writer.releaseLock();

        await this.sleep(SHORT_SLEEP_TIME);

        let reader = this.readStream.getReader();
        let response = await reader.read();
        reader.releaseLock();
        console.log(response.value);

        if (!compareByteArrays(response.value, Anytone878UVProtocol.GENERIC_ACK)) {
            throw new Error("Failed to exit program mode");
        }
    }

    async getRadioID(): Promise<Uint8Array> {
        log("Getting radio ID");
        let writer = this.writeStream.getWriter();
        await writer.write(Anytone878UVProtocol.CMD_IDENTIFY);
        writer.releaseLock();
        await this.sleep(SHORT_SLEEP_TIME);

        let reader = this.readStream.getReader();
        let response = await reader.read();
        reader.releaseLock();

        switch (response.value) {
            case undefined:
                throw new Error("No response from radio: undefined");
            default:
                if (response.value === undefined) {
                    throw new Error("Response from radio ok, but no sensible value");
                }
                return response.value;
        }
    }

    async readMemory(address: number): Promise<Uint8Array> {
        let addr = numberToAddress(address);
        let howMuchToRead = 255;
        log(`Reading memory at address ${address.toString(16)}, ${howMuchToRead} bytes`);

        let cmd = new Uint8Array(6);
        cmd.set(Anytone878UVProtocol.CMD_READ, 0);
        cmd.set(addr, 1);
        cmd.set([howMuchToRead], 5); // Read 255 bytes at once
        log(`Read memory command to send: ${cmd}`);

        let writer = this.writeStream.getWriter();
        await writer.write(cmd);
        writer.releaseLock();

        await this.sleep(SHORT_SLEEP_TIME);

        log("About to read response");
        let reader = this.readStream.getReader();
        let finished = false;
        let response = { done: false, value: new Uint8Array(0) };
        let content = new Uint8Array(0);
        while (!finished) {
            let response = await reader.read();
            if (response.value) {
                log(`Read ${response.value.length} bytes: ${response.value}`);
                content = new Uint8Array([...content, ...response.value]);
            } else {
                finished = true;
                break;
            }
            finished = (response.done || content.length == 263);
            log(`--- finished: ${finished}`);
        }
        reader.releaseLock();

        // We are expecting 1 + 4 + 1 + 255 + 1 + 1 = 263 bytes
        if (content.length !== 263) {
            throw new Error("Invalid response length");
        }

        if (content[0] !== Anytone878UVProtocol.CMD_WRITE[0]) {
            throw new Error("Radio should respond with the W (write) command");
        }

        let addrResponse = content.slice(1, 5);
        if (!compareByteArrays(addrResponse, addr)) {
            throw new Error(`Response address does not match request address ${addr} != ${addrResponse}`);
        }

        let lengthResponse = content.slice(5, 6);
        if (lengthResponse[0] !== howMuchToRead) {
            throw new Error(`Response length does not match request length: ${lengthResponse}`);
        }

        let data = content.slice(6, 255 + 6);
        let dataForChecksum = content.slice(1, 255 + 6);
        let checksum = content.slice(255 + 6, 255 + 7);
        let ack = content.slice(255 + 6 + 1, 255 + 7 + 1);

        if (calculateChecksum(dataForChecksum) !== checksum[0]) {
            log(`checksum received: ${checksum[0]}, calculated: ${calculateChecksum(dataForChecksum)}`);
            throw new Error("Checksum does not match");
        }

        if (!compareByteArrays(ack, Anytone878UVProtocol.GENERIC_ACK)) {
            throw new Error(`Radio did not acknowledge the read command: ${ack} != ${Anytone878UVProtocol.GENERIC_ACK}`);
        }

        return data;
    }

    async sleep(ms = 100) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

function numberToAddress(n: number): Uint8Array {
    let arr = new Uint8Array(4);
    arr[0] = n & 0xFF;
    arr[1] = (n >> 8) & 0xFF;
    arr[2] = (n >> 16) & 0xFF;
    arr[3] = (n >> 24) & 0xFF;
    return arr;
}