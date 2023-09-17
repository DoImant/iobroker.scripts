//
// Reading in SensEgg sensor data via the serial interface, parsing the JSON string and 
// storing the data in the corresponding data points.
//
// 03.06.2023 Initial Version
// 18.06.2023 Adapted to new data point structure for SensEgg sensors
// 17.09.2023 Only predefined IDs are permitted for data transfer.
//
// Ignore require error. Do NOT convert to import (it does not run in ioBroker)
// @ts-ignore
const { SerialPort, ReadlineParser } = require('serialport')
const idGroup = [201, 202, 203]; // Group of valid device IDs

// Create a port
const port = new SerialPort({
  path: '/dev/ttyNANO0',
  baudRate: 38400,
  autoOpen: false
});

// Create parser for port
const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

port.open(function (err: Error) {
  if (err) {
    log('Error opening port: ' + port.path, 'error');
    return log(err.message, 'error');
  }
  log('Open Serial: ' + port.path);
});

// The open event is always emitted.
port.on('open', function () {
  parser.on('data', parseData);   // Receive JSON Data as string
});

// close connection if script stopped
onStop(function () {
  if (port.isOpen) {
    port.close(function () {
      log('Close Serial: ' + port.path);
    });
  }
}, 2000 /*ms*/);

// Parse string and change received data to an object.
function parseData(receivedData: string): void {
  const idFirstPart = '0_userdata.0.sensEgg.Devices.';
  const idSecondPart: any = {
    BME_T: '.T',
    BME_H: '.raH',
    BME_P: '.aP',
    SNE_BATT: '.btVcc',
    NTC_T: '.ntcT'
  }

  //const receivedData = '{"SENSOR_ID":201,"data":{"BME_T":"12.3","BME_H":"55.7","BME_P":"1019","SNE_BATT":"2.987","NTC_T":"22.1"}}';
  //console.log(receivedData);
  let sensorData = JSON.parse(receivedData);
  if (idGroup.includes(sensorData.SENSOR_ID)) {
    for (let property in sensorData.data) {
      let id = idFirstPart.concat(sensorData.SENSOR_ID, idSecondPart[property]);
      let val = Number(sensorData.data[property]);
      // console.log(id + ' ' + val);
      setState(id, val, true);
    }
  } else {
    console.log('ID ' + sensorData.SENSOR_ID  + ' is not permitted');
  }
}
