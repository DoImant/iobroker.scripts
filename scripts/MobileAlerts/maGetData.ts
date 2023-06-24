//
// Generate data points for a mobile alert rain sensor and periodically query the API for current data 
// to store in ioBroker.
//
// 17.06.2023 Initial version
//
// @ts-ignore
const fetch = require('node-fetch');
// @ts-ignore
const maDeviceID: string = require('../../../iobroker-data/include/credentials.ts'); //My  Device ID, not published

const mobileAlertsPath = '0_userdata.0.mobileAlerts.Devices.';  //Datenpunkte werden in diesem Pfad erzeugt.
const apiURL = 'https://www.data199.com/api/pv1/device/lastmeasurement';

// Example Device ID  -> deviceids=0E7EA4A71203,09265A8A3503&phoneid=880071013613
// The phoneid must be specified if alarms configured in the app are also to be delivered
const phoneId = '';

/* uncomment this
const measurement02 = new Map([
  ["t1", { maItem: true, name: "Temperatur", type: "number", role: 'value', unit: "°C", iValue: 0 }],
  ["ts", { maItem: true, name: "Timestamp", type: "number", role: 'value', unit: "sec", iValue: 0 }],
  ["lb", { maItem: true, name: "Low Battery", type: "boolean", role: 'state', unit: "", iValue: false }]]);
*/

// Data points with the value maItem = false are not updated by the getData() function.
const measurement08 = new Map([
  ['t1', { maItem: true, name: 'Temperatur', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['r', { maItem: true, name: 'Regenmenge gesamt', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['rf', { maItem: true, name: 'Zaehler Wippe', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['lrf', { maItem: false, name: 'Vgl. Wert Wippe', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['rsd', { maItem: false, name: 'Regenmenge pro Abfrage', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['rb', { maItem: false, name: 'Regenalarm', type: 'boolean', role: 'state', unit: '', iValue: false }],
  ['lb', { maItem: true, name: 'Batterie leer', type: 'boolean', role: 'state', unit: '', iValue: false }]]);

// Here the name and the data structure to be used are defined for each device Id.
/* uncomment this
let propertyArray = [
{ id: '0301548CBC4A', name: 'Sample Sensor Berlin', data: measurement02 },
{ id: '08004EA0B619', name: 'Sample Rainsensor', data: measurement08 }];
*/
let propertyArray = [{ id: maDeviceID, name: 'Regensensor', data: measurement08 }];  // delete this or change id

// If the rain flag (rb) = true but the flipcounter value does not change anymore, this counter is 
// incremented to the maximum value before the rain flag is set to false again. 
let rainTrueResetCounter = 0;
// Maximum counter value
// With a query interval of the API of two minutes, the reset occurs after maxRainTrueResetCounter * 2 minutes  
const maxRainTrueResetCounter = 5;

let deviceIdString = '';
var propertiesById = new Map();
propertyArray.forEach(function (item) {
  propertiesById.set(item.id, item);
  deviceIdString += item.id + ',';
})

deviceIdString = deviceIdString.substring(0, deviceIdString.length - 1);  // Remove comma
let body = 'deviceids=' + deviceIdString;
if (phoneId) { body += '&phoneid=' + phoneId; }

propertyArray.forEach(function (item) {
  item.data.forEach(function (subitem: any, key) {
    let id = mobileAlertsPath + item.id + '.' + key;
    if (!existsObject(id)) {
      createState(
        id,
        subitem.iValue,
        {
          'name': subitem.name,
          'type': subitem.type,
          'unit': subitem.unit,
          'read': true,
          'write': true,
          'role': subitem.role
        });
    }
  });
});

async function doPostRequest(): Promise<string | null> {
  try {
    const response = await fetch(apiURL, {
      method: 'post',
      body: body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return (await response.json());
  } catch (error) {
    console.log('Mobile Alerts request: ' + error, error);
  }
  return null;
}

function checkDefined(value: number | boolean, dataType: string) {
  if (value === undefined) {
    switch (dataType) {
      case 'number': value = 0; break;
      case 'boolean': value = false; break;
    }
  }
  return value;
}

function checkForRain(deviceid: string, rfVal: number) {
  const basePath = mobileAlertsPath + deviceid;
  const lrfID = basePath + '.lrf';
  const rbID = basePath + '.rb';
  const rsdID = basePath + '.rsd';
  const rr: number = 0.258;

  if (!rfVal) {   // If rfVal = 0, this value was reset and it doesn't rain.
    setState(lrfID, rfVal, true);
    return;
  }

  let itIsRaining = getState(rbID).val;
  let lrfVal = getState(lrfID).val;
  let rfDiff = rfVal - lrfVal;  // no rain if result is zero.
  let r = rfDiff * rr;          // Rainfall amount since last data request.

  if (rfDiff) {   // if the flipcounter is not equal to the stored counter, it must be raining.
    log('Es regnet!');
    rainTrueResetCounter = 0;
    setState(lrfID, rfVal, true);
    setState(rsdID, r, true);
    itIsRaining === false && setState(rbID, true, true);   // setState if first expression is true 
  } else if (itIsRaining === true) {
    ++rainTrueResetCounter;
    log('Es regnet nicht mehr (' + rainTrueResetCounter + '/' + maxRainTrueResetCounter + ')');
    if (rainTrueResetCounter >= maxRainTrueResetCounter) {
      rainTrueResetCounter = 0;
      setState(rbID, false, true);
    }
  }
}

async function getData() {
  let data = await doPostRequest();
  // log(data);
  if (data) {
    data = JSON.stringify(data).replace(/'/g, '"');
    let obj = JSON.parse(data);
    if (obj.success == true) {
      obj.devices.forEach(function (item: any) {
        let props = propertiesById.get(item.deviceid);
        for (var [key, subitem] of props.data) {
          let value = checkDefined(item.measurement[key], subitem.type);
          subitem.maItem === true && setState(mobileAlertsPath + item.deviceid + "." + key, value, true);
          key === 'rf' && checkForRain(item.deviceid, item.measurement[key]); // check flipcounter if key is = 'rf'
        };
      });
    } else {
      log('Mobile Alerts: (2) Received object contains error "' + obj.errorcode + '": ' + obj.errormessage);
    }
  };
};

schedule('*/2 * * * *', getData);