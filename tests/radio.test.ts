import { Anytone878UV } from '../src/radio';
import { compareByteArrays } from '../src/utils';
import { Serial, SerialPort } from 'webserial';

let serialPort: SerialPort;

describe('Anytone878UV', () => {
    before(async () => {
        let s = new Serial({ requestPortHook: (ports: Array<Object>) => { return ports[0] } });
        serialPort = await s.requestPort({ filters: [{ usbVendorId: 0x28e9, usbProductId: 0x018a }] });
    });

    it('should retrieve radio ID', async () => {
        let radio = new Anytone878UV(serialPort);
        await radio.open();

        let val = await radio.getRadioID();
        if (!compareByteArrays(val, new Uint8Array([73, 68, 56, 55, 56, 85, 86, 0, 0, 86, 49, 48, 48, 0, 0, 6]))) {
            throw new Error("Radio ID does not match");
        }
    }).timeout(5000);
});
