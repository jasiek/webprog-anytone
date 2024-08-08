import { SerialPort } from 'web-serial-polyfill';

export interface Radio {
    getProductID(): number;
    getVendorID(): number;
    writeCodeplug(codeplug: Uint8Array): void;
    readCodeplug(): Promise<Uint8Array>;
}

export class Anytone878UV implements Radio {
    protocol: Anytone878UVProtocol;

    constructor(serialPort: SerialPort) {
        this.protocol = new Anytone878UVProtocol(serialPort);
    }

    getProductID(): number {
        return 0x018a;
    }

    getVendorID(): number {
        return 0x28e9;
    }

    async writeCodeplug(codeplug: Uint8Array): Promise<void> {
        await this.protocol.enterProgramMode();
        await this.protocol.exitProgramMode();
    }

    async readCodeplug(): Promise<Uint8Array> {
        await this.protocol.enterProgramMode();
        await this.protocol.exitProgramMode();
        // TODO fix later
        return new Uint8Array();
    }
}

class Anytone878UVProtocol {
    static readonly ENTER_PROGRAM_MODE = new Uint8Array(Buffer.from("PROGRAM"));
    static readonly ENTER_PROGRAM_MODE_ACK = new Uint8Array(Buffer.from("QX\x06"));

    static readonly EXIT_PROGRAM_MODE = new Uint8Array(Buffer.from("END"));

    static readonly IDENTIFY_COMMAND = new Uint8Array(Buffer.from("\x02"));

    serialPort: SerialPort;

    constructor(serialPort: SerialPort) {
        this.serialPort = serialPort;
    }

    async enterProgramMode(): Promise<void> {
        await this.serialPort.writable?.getWriter().write(Anytone878UVProtocol.ENTER_PROGRAM_MODE);
        let response = await this.serialPort.readable?.getReader().read();
        if (response?.value !== Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK) {
            throw new Error("Failed to enter program mode");
        }
    }

    async exitProgramMode(): Promise<void> {
        await this.serialPort.writable?.getWriter().write(Anytone878UVProtocol.EXIT_PROGRAM_MODE);
        let response = await this.serialPort.readable?.getReader().read();
        if (response?.value !== Anytone878UVProtocol.ENTER_PROGRAM_MODE_ACK) {
            throw new Error("Failed to exit program mode");
        }
    }

    async getRadioID(): Promise<Uint8Array> {
        await this.serialPort.writable?.getWriter().write(Anytone878UVProtocol.IDENTIFY_COMMAND);
        let response = await this.serialPort.readable?.getReader().read();
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
}