import { Anytone878UV } from '../src/radio';
import { serial, SerialPort } from 'web-serial-polyfill';

let serialPort: SerialPort;

beforeAll(async () => {
    serialPort = await serial.requestPort();
});

describe('Anytone878UV', () => {
    it('should identify the radio', async () => {
        let radio = new Anytone878UV(serialPort);
        expect(radio.getProductID()).toBe(0x018a);
        expect(radio.getVendorID()).toBe(0x28e9);
    });
});
