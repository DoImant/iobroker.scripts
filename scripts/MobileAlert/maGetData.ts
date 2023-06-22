//
// Generate data points for a mobile alert rain sensor and periodically query the API for current data 
// to store in ioBroker.
//
// 17.06.2023 Initial version
//

const fetch = require('node-fetch');
const maDeviceID: string = require('../../../iobroker-data/include/credentials.ts'); //My  Device ID, not published

const mobileAlertsPath = '0_userdata.0.mobileAlerts.Devices.';  //Datenpunkte werden in diesem Pfad erzeugt.
const apiURL = 'https://www.data199.com/api/pv1/device/lastmeasurement';

// Example Device ID  -> deviceids=0E7EA4A71203,09265A8A3503&phoneid=880071013613
// The phoneid must be specified if alarms configured in the app are also to be delivered
const phoneId = '';

/* uncomment this
const measurement02 = new Map([
  ["t1", { active: true, name: "Temperatur", type: "number", role: 'value', unit: "°C", iValue: 0 }],
  ["ts", { active: true, name: "Timestamp", type: "number", role: 'value', unit: "sec", iValue: 0 }],
  ["lb", { active: true, name: "Low Battery", type: "boolean", role: 'state', unit: "", iValue: false }]]);
*/

// Data points with the value active = false are not updated by the getData() function.
const measurement08 = new Map([
  ['t1', { active: true, name: 'Temperatur', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['r', { active: true, name: 'Regenmenge', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['rf', { active: true, name: 'Zaehler Wippe', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['lrf', { active: false, name: 'Vgl. Wert Wippe', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['rb', { active: false, name: 'Regenalarm', type: 'boolean', role: 'state', unit: '', iValue: false }],
  ['lb', { active: true, name: 'Batterie leer', type: 'boolean', role: 'state', unit: '', iValue: false }]]);

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
    console.log('Mobile Alerts request error: ' + error, error);
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
  const rfID = mobileAlertsPath + deviceid + '.rf';
  const lrfID = rfID.replace(/\.rf$/, '.lrf');
  const rbID = rfID.replace(/\.rf$/, '.rb');
  let itIsRaining = getState(rbID).val;

  if (!rfVal) { setState(lrfID, rfVal, true); return; } // If rfVal = 0, this value was reset and it doesn't rain. 

  if (rfVal != getState(lrfID).val) {  // if the flipcounter is not equal to the stored counter, it must be raining.
    log('Es regnet!');
    rainTrueResetCounter = 0;
    setState(lrfID, rfVal, true);
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
      obj.devices.forEach(function (item: { [x: string]: { [x: string]: number; }; deviceid: any; } ) {
        let props = propertiesById.get(item.deviceid);
        for (var [key, subitem] of props.data) {
          let value = checkDefined(item['measurement'][key], subitem.type);
          subitem.active === true && setState(mobileAlertsPath + item.deviceid + "." + key, value, true);
          key === 'rf' && checkForRain(item.deviceid, item['measurement'][key]); // check flipcounter if key is = 'rf'
        };
      });
    } else {
      log('Mobile Alerts: (2) Received object contains error "' + obj.errorcode + '": ' + obj.errormessage);
    }
  };
};

schedule('*/2 * * * *', getData);
