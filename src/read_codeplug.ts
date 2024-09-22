
import { Anytone878UV } from '../src/radio';
import { log } from '../src/utils';
import { Serial, SerialPort } from 'webserial';
import { write, writeFile } from 'node:fs';

let f = async () => {
    let s = new Serial({ requestPortHook: (ports: Array<Object>) => { return ports[0] } });
    let serialPort = await s.requestPort({ filters: [{ usbVendorId: 0x28e9, usbProductId: 0x018a }] });
    log.debugMode = true;

    let radio = new Anytone878UV(serialPort);
    await radio.open();

    let val = await radio.readCodeplug();
    if (val.length !== 0x7600000 - 0x800000) {
        throw new Error("Codeplug length does not match");
    }
    await writeFile('codeplug.bin', val, (err) => {
        if (err) throw err;
        console.log('Codeplug saved to codeplug.bin');
    });
};

f().then(() => {
    console.log('done');
});
