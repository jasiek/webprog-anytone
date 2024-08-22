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
        let reader = this.serialPort.readable.getReader();
        let writer = this.serialPort.writable.getWriter();
        this.protocol = new Anytone878UVProtocol(reader, writer);
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
            await this.protocol.exitProgramMode();
        }
    }
}

class Anytone878UVProtocol {
    static readonly ENTER_PROGRAM_MODE = new Uint8Array(Buffer.from("PROGRAM"));
    static readonly ENTER_PROGRAM_MODE_ACK = new Uint8Array(Buffer.from("QX\x06"));

    static readonly EXIT_PROGRAM_MODE = new Uint8Array(Buffer.from("END"));

    static readonly IDENTIFY_COMMAND = new Uint8Array(Buffer.from("\x02"));
    
    reader: ReadableStreamDefaultReader<Uint8Array>;
    writer: WritableStreamDefaultWriter<Uint8Array>;


    constructor(reader: ReadableStreamDefaultReader<Uint8Array>, writer: WritableStreamDefaultWriter<Uint8Array>) {
        this.reader = reader;
        this.writer = writer;
    }

    async enterProgramMode(): Promise<void> {
        await this.writer.write(Anytone878UVProtocol.ENTER_PROGRAM_MODE);
        let response = await this.reader.read();
        if (!compareByteArrays(response.value, Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK)) {
            throw new Error("Failed to enter program mode");
        }
    }

    async exitProgramMode(): Promise<void> {
        await this.writer.write(Anytone878UVProtocol.EXIT_PROGRAM_MODE);
        let response = await this.reader.read();
        if (!compareByteArrays(response.value, Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK)) {
            throw new Error("Failed to exit program mode");
        }
    }

    async getRadioID(): Promise<Uint8Array> {
        await this.writer.write(Anytone878UVProtocol.IDENTIFY_COMMAND);
        let response = await this.reader.read();
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
}

export async function getBackend(): Promise<ISerialBackend> {
    const mod = await import('web-serial-polyfill');
    return mod.serial;
}