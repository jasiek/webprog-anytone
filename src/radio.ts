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
    writeCodeplug(codeplug: Uint8Array): void;
    readCodeplug(): Promise<Uint8Array>;
}

export class Anytone878UV implements Radio {
    protocol: Anytone878UVProtocol;

    constructor(serialPort: ISerialPort) {
        this.protocol = new Anytone878UVProtocol(serialPort);
    }

    getProductID(): number {
        return 0x018a;
    }

    getVendorID(): number {
        return 0x28e9;
    }

    async writeCodeplug(codeplug: Uint8Array): Promise<void> {
        // TODO
    }

    async readCodeplug(): Promise<Uint8Array> {
        this.protocol.open();
        await this.protocol.enterProgramMode();
        await this.protocol.exitProgramMode();
        // TODO fix later
        this.protocol.close();
        return new Uint8Array();
    }

    async getRadioID(): Promise<Uint8Array> {
        this.protocol.open();
        let val = this.protocol.getRadioID();
        //this.protocol.close();
        return val;
    }
}

class Anytone878UVProtocol {
    static readonly ENTER_PROGRAM_MODE = new Uint8Array(Buffer.from("PROGRAM"));
    static readonly ENTER_PROGRAM_MODE_ACK = new Uint8Array(Buffer.from("QX\x06"));

    static readonly EXIT_PROGRAM_MODE = new Uint8Array(Buffer.from("END"));

    static readonly IDENTIFY_COMMAND = new Uint8Array(Buffer.from("\x02"));

    serialPort: ISerialPort;
    writer: WritableStreamDefaultWriter<Uint8Array> | null;
    reader: ReadableStreamDefaultReader<Uint8Array> | null;

    constructor(serialPort: ISerialPort) {
        this.serialPort = serialPort;
        this.writer = null;
        this.reader = null;
    }

    async open(): Promise<void> {
        let x = await this.serialPort.open({ baudRate: 921600 });
        this.writer = this.serialPort.writable.getWriter();
        this.reader = this.serialPort.readable.getReader();
    }

    async close(): Promise<void> {
        await this.serialPort.close();
    }

    async enterProgramMode(): Promise<void> {
        this.checkIO();
        await this.writer?.write(Anytone878UVProtocol.ENTER_PROGRAM_MODE);
        let response = await this.reader?.read();
        if (response?.value !== Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK) {
            throw new Error("Failed to enter program mode");
        }
    }

    async exitProgramMode(): Promise<void> {
        this.checkIO();
        await this.writer?.write(Anytone878UVProtocol.EXIT_PROGRAM_MODE);
        let response = await this.reader?.read();
        if (response?.value !== Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK) {
            throw new Error("Failed to exit program mode");
        }
    }

    async getRadioID(): Promise<Uint8Array> {
        this.checkIO();
        await this.writer?.write(Anytone878UVProtocol.IDENTIFY_COMMAND);
        let response = await this.reader?.read();
        switch (response?.value) {
            case undefined:
                throw new Error("No response from radio");
            default:
                if (response?.value === undefined) {
                    throw new Error("No response from radio");
                }
                return response.value;
        }
    }

    checkIO(): void {
        if (this.writer == null) {
            throw new Error("Writer is null");
        }
        if (this.reader == null) {
            throw new Error("Reader is null");
        }
    }
}

export async function getBackend(): Promise<ISerialBackend> {
    const mod = await import('web-serial-polyfill');
    return mod.serial;
}