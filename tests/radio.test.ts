import { Anytone878UV } from '../src/radio';
import { Serial, SerialPort } from 'webserial';

let serialPort: SerialPort;

beforeAll(async () => {
    let s = new Serial({requestPortHook: (ports: Array<Object>) => { return ports[0]}});
    serialPort = await s.requestPort({ filters: [{ usbVendorId: 0x28e9, usbProductId: 0x018a }] });
});

describe('Anytone878UV', () => {
   /* it('should identify the radio', async () => {
        let radio = new Anytone878UV(serialPort);
        expect(radio.getProductID()).toBe(0x018a);
        expect(radio.getVendorID()).toBe(0x28e9);
    });*/

    it('should retrieve radio ID', async () => {
        let radio = new Anytone878UV(serialPort);
        console.log(await radio.getRadioID());
    });
});

