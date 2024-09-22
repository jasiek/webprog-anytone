import { compareByteArrays, calculateChecksum } from './utils';

// This declaration is here so that the rest may be generic.
interface ISerialBackend {
    requestPort(options?: any, polyfillOptions?: any): Promise<any>;
    getPorts(polyfillOptions?: any): Promise<any[]>;
}

interface ISerialPort {
    open(options?: any): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
}

export interface Radio {
    getProductID(): number;
    getVendorID(): number;
    //writeCodeplug(codeplug: Uint8Array): void;
    //readCodeplug(): Promise<Uint8Array>;
}

export class Anytone878UV implements Radio {
    static readonly MEMORY_LOW = 0x00800000
    static readonly MEMORY_HIGH = 0x7680000
    serialPort: ISerialPort;
    protocol: Anytone878UVProtocol | null;

    constructor(serialPort: ISerialPort) {
        this.serialPort = serialPort;
        this.protocol = null;
    }

    getProductID(): number {
        return 0x018a;
    }

    getVendorID(): number {
        return 0x28e9;
    }

    async open() {
        if (!this.serialPort.readable || !this.serialPort.writable) {
            await this.serialPort.open({ baudRate: 921600 });
        }
        this.protocol = new Anytone878UVProtocol(this.serialPort.readable!, this.serialPort.writable!);
    }

    async close() {
        await this.serialPort.close();
    }

    async getRadioID(): Promise<Uint8Array> {
        if (this.protocol === null) {
            throw new Error("Radio not open");
        }
        try {
            await this.protocol.enterProgramMode();
            let val = await this.protocol.getRadioID();
            return val;
        } finally {
            console.log('exit programmode')
            await this.protocol.exitProgramMode();
        }
    }

    async readCodeplug(): Promise<Uint8Array> {
        if (this.protocol === null) {
            throw new Error("Radio not open");
        }
        try {
            await this.protocol.enterProgramMode();
            let memory = new Uint8Array(Anytone878UV.MEMORY_HIGH - Anytone878UV.MEMORY_LOW);
            let addr = Anytone878UV.MEMORY_LOW;
            while (addr < Anytone878UV.MEMORY_HIGH) {
                let data = await this.protocol.readMemory(addr);
                memory.set(data, addr - Anytone878UV.MEMORY_LOW);
                console.log('read memory at', addr.toString(16));
                console.log(data);
                addr += 255;
            }
            return memory;
        } catch (e) {
            console.log(e);
            throw e;
        } finally {
            await this.protocol.exitProgramMode();
        }
    }
}

class Anytone878UVProtocol {
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
        let writer = this.writeStream.getWriter();
        await writer.write(Anytone878UVProtocol.CMD_PROGRAM_MODE);
        writer.releaseLock();
        await this.sleep(1000);

        let reader = this.readStream.getReader();
        let response = await reader.read();
        reader.releaseLock();

        if (!compareByteArrays(response.value, Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK)) {
            throw new Error("Failed to enter program mode");
        }
    }

    async exitProgramMode(): Promise<void> {
        let writer = this.writeStream.getWriter();
        await writer.write(Anytone878UVProtocol.CMD_EXIT_PROGRAM_MODE);
        writer.releaseLock();

        console.log('exited program mode');
        await this.sleep(100); // Delay to allow radio to process command, devised by trial and error

        let reader = this.readStream.getReader();
        let response = await reader.read();
        reader.releaseLock();
        console.log(response.value);

        if (!compareByteArrays(response.value, Anytone878UVProtocol.GENERIC_ACK)) {
            throw new Error("Failed to exit program mode");
        }
    }

    async getRadioID(): Promise<Uint8Array> {
        let writer = this.writeStream.getWriter();
        await writer.write(Anytone878UVProtocol.CMD_IDENTIFY);
        writer.releaseLock();
        console.log('wrote identify command');
        await this.sleep(100);

        let reader = this.readStream.getReader();
        let response = await reader.read();
        reader.releaseLock();

        console.log('read');
        console.log(response.value);
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

        let cmd = new Uint8Array(6);
        cmd.set(Anytone878UVProtocol.CMD_READ, 0);
        cmd.set(addr, 1);
        cmd.set([howMuchToRead], 5); // Read 255 bytes at once
        console.log('read memory command', cmd);

        let writer = this.writeStream.getWriter();
        await writer.write(cmd);
        writer.releaseLock();

        await this.sleep(100);

        console.log('about top read response');
        let reader = this.readStream.getReader();
        let finished = false;
        let response = { done: false, value: new Uint8Array(0) };
        let content = new Uint8Array(0);
        while (!finished) {
            let response = await reader.read();
            if (response.value) {
                console.log('read bytes:', response.value.length);
                content = new Uint8Array([...content, ...response.value]);
            } else {
                console.log('read bytes: undefined');
            }
            console.log(response)
            finished = (response.done || content.length == 263);
            console.log('---');
            console.log('finished: ', finished);
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
            console.log("chedcksum received: ", checksum[0]);
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


export async function getBackend(): Promise<ISerialBackend> {
    const mod = await import('web-serial-polyfill');
    return mod.serial;
}