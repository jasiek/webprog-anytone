import { Anytone878UV } from '../src/radio';
import { compareByteArrays, calculateChecksum } from '../src/utils';
import { Serial, SerialPort } from 'webserial';

let serialPort: SerialPort;

describe('Anytone878UV', () => {
    before(async () => {
        let s = new Serial({ requestPortHook: (ports: Array<Object>) => { return ports[0] } });
        serialPort = await s.requestPort({ filters: [{ usbVendorId: 0x28e9, usbProductId: 0x018a }] });
    });

    after(async () => {
        // await serialPort.close();
        // this blows up sometimes with      UnknownError: Device not configured
    });

    xit('should retrieve radio ID', async () => {
        let radio = new Anytone878UV(serialPort);
        await radio.open();

        let val = await radio.getRadioID();
        if (!compareByteArrays(val, new Uint8Array([73, 68, 56, 55, 56, 85, 86, 0, 0, 86, 49, 48, 48, 0, 0, 6]))) {
            throw new Error("Radio ID does not match");
        }
    }).timeout(5000);

    it('should read the codeplug', async () => {
        let radio = new Anytone878UV(serialPort);
        await radio.open();

        let val = await radio.readCodeplug();
        if (val.length !== 0x7600000 - 0x800000) {
            throw new Error("Codeplug length does not match");
        }
    }).timeout(5000);

    it('should calculate the checksum', () => {
        let data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        if (calculateChecksum(data) !== 55) {
            throw new Error("Checksum does not match");
        }
    });
});
