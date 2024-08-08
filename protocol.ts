
class ReadRequest {
    buffer: ArrayBuffer;
    view: DataView;

    constructor(address: number) {
        this.view = new DataView(new ArrayBuffer(6));
        this.view.setUint8(0, 82); // R
        this.view.setUint32(1, address, true);
        this.view.setUint8(5, 16); // always read 16 bytes
    }

    toUint8Array(): Uint8Array {
        return new Uint8Array(this.buffer);
    }
}

class ReadResponse {
    buffer: ArrayBuffer;
    view: DataView;

    constructor(data: Uint8Array) {
        this.buffer = data.buffer;
        this.view = new DataView(this.buffer);
    }

    getAddress(): number {
        return this.view.getUint32(1, true);
    }

    getData(): Uint8Array {
        return new Uint8Array(this.buffer, 5, 16);
    }
}

class WriteRequest {
    buffer: ArrayBuffer;
    view: DataView;

    constructor(address number, data: Uint8Array) {
        this.buffer = new ArrayBuffer(24);
        this.view.setUint8(0, 87); // W
        this.view.setUint32(1, address, false);
        for (let i = 0; i < data.length; i++) {
            this.view.setUint8(5 + i, data[i]);
        }
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

    async getRadioID(): Promise<string> {
        await this.serialPort.writable?.getWriter().write(Anytone878UVProtocol.IDENTIFY_COMMAND);
    }
}