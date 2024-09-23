import { compareByteArrays, calculateChecksum, log } from './utils';
import { Anytone878UVProtocol } from './protocol';

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
    static readonly MEMORY_LOW = 0x0800000
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
            await this.protocol.exitProgramMode();
        }
    }

    async readCodeplug(): Promise<Uint8Array> {
        if (this.protocol === null) {
            throw new Error("Radio not open");
        }
        try {
            await this.protocol.enterProgramMode();
            log(`Reading memory from ${Anytone878UV.MEMORY_LOW.toString(16)} to ${Anytone878UV.MEMORY_HIGH.toString(16)}, ${Anytone878UV.MEMORY_HIGH - Anytone878UV.MEMORY_LOW} bytes`);
            let memory = new Uint8Array(Anytone878UV.MEMORY_HIGH - Anytone878UV.MEMORY_LOW);
            let addr = Anytone878UV.MEMORY_LOW;
            while (addr < Anytone878UV.MEMORY_HIGH) {
                let data = await this.protocol.readMemory(addr);
                memory.set(data, addr - Anytone878UV.MEMORY_LOW);
                addr += 255;
            }
            return memory;
        } catch (e: any) {
            log(e.toString());
            throw e;
        } finally {
            await this.protocol.exitProgramMode();
        }
    }
}




export async function getBackend(): Promise<ISerialBackend> {
    const mod = await import('web-serial-polyfill');
    return mod.serial;
}