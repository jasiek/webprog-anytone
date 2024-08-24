import { compareByteArrays } from './utils';

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
        await this.serialPort.open({ baudRate: 921600 });
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
}

class Anytone878UVProtocol {
    static readonly ENTER_PROGRAM_MODE = new Uint8Array(Buffer.from("PROGRAM"));
    static readonly ENTER_PROGRAM_MODE_ACK = new Uint8Array(Buffer.from("QX\x06"));

    static readonly EXIT_PROGRAM_MODE = new Uint8Array(Buffer.from("END"));
    static readonly GENERIC_ACK = new Uint8Array(Buffer.from("\x06"));

    static readonly IDENTIFY_COMMAND = new Uint8Array(Buffer.from("\x02"));

    readStream: ReadableStream<Uint8Array>;
    writeStream: WritableStream<Uint8Array>;


    constructor(readStream: ReadableStream<Uint8Array>, writeStream: WritableStream<Uint8Array>) {
        this.readStream = readStream;
        this.writeStream = writeStream;
    }

    async enterProgramMode(): Promise<void> {
        let writer = this.writeStream.getWriter();
        await writer.write(Anytone878UVProtocol.ENTER_PROGRAM_MODE);
        writer.releaseLock();
        await this.sleep(1000);
        console.log('entered program mode');

        let reader = this.readStream.getReader();
        console.log(reader);
        let response = await reader.read();
        console.log('read');
        reader.releaseLock();

        if (!compareByteArrays(response.value, Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK)) {
            throw new Error("Failed to enter program mode");
        }
    }

    async exitProgramMode(): Promise<void> {
        let writer = this.writeStream.getWriter();
        await writer.write(Anytone878UVProtocol.EXIT_PROGRAM_MODE);
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
        await writer.write(Anytone878UVProtocol.IDENTIFY_COMMAND);
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

    async sleep(ms = 100) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export async function getBackend(): Promise<ISerialBackend> {
    const mod = await import('web-serial-polyfill');
    return mod.serial;
}