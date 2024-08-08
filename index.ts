import { webusb } from 'usb';

(async () => {
    // Returns first matching device
    const device = await webusb.requestDevice({
        filters: [{}]
    })

    console.log(device); // WebUSB device
})();

