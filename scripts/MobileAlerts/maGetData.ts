//
// Generate data points for a mobile alert rain sensor and periodically query the API for current data 
// to store in ioBroker.
//
// 17.06.2023 Initial version
// 05.07.2023 Object-ID rst (rain sum total per day) added.
//            Log output changed
// 06.07.2023 refactoring of doPostRequest() and getData()
//            Experimental:
//            added a function to send push messages via pushover service (If the service is not installed,
//            the send request will be ignored) 
//
// @ts-ignore
const fetch = require('node-fetch');
// @ts-ignore
const maDeviceID: string = require('/opt/iobroker/iobroker-data/include/credentials.ts'); //My  Device ID, not published

const mobileAlertsPath = '0_userdata.0.mobileAlerts.Devices.';  //Datenpunkte werden in diesem Pfad erzeugt.
const apiURL = 'https://www.data199.com/api/pv1/device/lastmeasurement';

// Example Device ID  -> deviceids=0E7EA4A71203,09265A8A3503&phoneid=880071013613
// The phoneid must be specified if alarms configured in the app are also to be delivered
const phoneId = '';

// If the rain flag (rb) = true but the flip counter value does not change anymore, this counter is 
// incremented to the maximum value before the rain flag is set to false again. 
let rainTrueResetCounter = 0;
// Maximum counter value
// With a query interval of the API of two minutes, the reset occurs after maxRainTrueResetCounter * 2 minutes  
const maxRainTrueResetCounter = 5;

// Pushover Message object
// https://github.com/ioBroker/ioBroker.pushover/blob/master/docs/de/README.md
// Adjust the values to your environment
const poFilePath = '/opt/iobroker/iobroker-data/include/img/';
const poMessageData = {
  message: '', title: 'Mobile Alerts', sound: 'pushover',
  file: poFilePath + 'umbrella-64.png'
}

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
  ['rst', { maItem: false, name: 'Regenmenge pro Tag', type: 'number', role: 'value', unit: '', iValue: 0 }],
  ['rb', { maItem: false, name: 'Regenalarm', type: 'boolean', role: 'state', unit: '', iValue: false }],
  ['lb', { maItem: true, name: 'Batterie leer', type: 'boolean', role: 'state', unit: '', iValue: false }]]);

// Here the name and the data structure to be used are defined for each device Id.
/* uncomment this
let propertyArray = [
{ id: '0301548CBC4A', name: 'Sample Sensor Berlin', data: measurement02 },
{ id: '08004EA0B619', name: 'Sample Rainsensor', data: measurement08 }];
*/
let propertyArray = [{ id: maDeviceID, name: 'Regensensor', data: measurement08 }];

/* This code block is creating a string called `deviceIdString` which will contain all the device IDs from the
`propertyArray`. It also creates a `propertiesById` map to store the properties of each device ID. 
The deviceidString is needed for the API query to retrieve the data for all sensors stored in the propertyArray. */
let deviceIdString = '';
var propertiesById = new Map();
propertyArray.forEach(function (item) {
  propertiesById.set(item.id, item);
  deviceIdString += item.id + ',';
})

deviceIdString = deviceIdString.substring(0, deviceIdString.length - 1);  // Remove comma
let body = 'deviceids=' + deviceIdString;
if (phoneId) { body += '&phoneid=' + phoneId; }


/* This code block is iterating over each item in the `propertyArray` array. For each item, it then iterates over the
`data` property of that item. If the corresponding objects do not yet exist in the iobroker object database, 
they will be created.*/
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

/**
 * This  function is an asynchronous function that sends a POST request to an API URL and returns the response as a
 * string.
 * @returns a Promise that resolves to a string.
 */
async function doPostRequest(): Promise<string> {
  let result = '';
  try {
    const response = await fetch(apiURL, {
      method: 'post',
      body: body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    result = await response.text();
  } catch (error) {
    log('Mobile Alerts request: ' + error, 'error');
  }
  return result;
}

/**
 * The function checks if a value is defined and returns a default value based on the data type if it is undefined.
 * @param {number | boolean} value - The value parameter can be either a number or a boolean.
 * @param {string} dataType - The `dataType` parameter is a string that specifies the type of the `value` parameter. It can
 * be either `'number'` or `'boolean'`.
 * @returns the value that was passed in, unless it is undefined. If the value is undefined, the function will set it to a
 * default value based on the dataType parameter and then return the updated value.
 */
function checkDefined(value: number | boolean, dataType: string) {
  if (value === undefined) {
    switch (dataType) {
      case 'number': value = 0; break;
      case 'boolean': value = false; break;
    }
  }
  return value;
}

poMessageData.message = 'Es regnet nicht mehr...';
poMessageData.file = poFilePath + 'sunshine-64.png';
sendPoMessage();
/**
 * The function sends a message to the Pushover service if the remaining limit state exists and is true.
 * @param {string} msgText - A string that represents the message text to be sent.
 * @param {any} msgObj - The `messageData` parameter is an object that contains additional data for the message. It
 * can include properties such as the recipient's user key, device name, priority, sound, and other options specific 
 * to the Pushover service. If the pushover service is not installed or the message limit is exceeded, 
 * nothing will be executed.  
 */
async function sendPoMessage(msgObj: any = poMessageData) {
  const poID = 'pushover.0.app.remainingLimit';
  if (existsObject(poID) && getState(poID).val) {
    sendTo('pushover', msgObj);
  }
}

/**
 * The function `checkForRain` checks if it is raining based on the flip count value (rf) and updates 
 * the state accordingly.
 * @param {string} deviceid - A string representing the unique identifier of the device.
 * @param {number} rfVal - The parameter `rfVal` represents the current flip count value.
 * @returns The function does not explicitly return a value.
 */
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
    log('It\'s raining!');
    rainTrueResetCounter = 0;
    setState(lrfID, rfVal, true);
    setState(rsdID, r, true);
    itIsRaining === false && setState(rbID, true, true);   // setState if first expression is true 
    poMessageData.message = 'Es ist am regnen...';
    poMessageData.file = poFilePath + 'umbrella-64.png';
    sendPoMessage();
  } else if (itIsRaining === true) {
    ++rainTrueResetCounter;
    log('Tests for rain end (' + rainTrueResetCounter + '/' + maxRainTrueResetCounter + ')');
    if (rainTrueResetCounter >= maxRainTrueResetCounter) {
      log('It no longer rains');
      rainTrueResetCounter = 0;
      setState(rbID, false, true);
      poMessageData.message = 'Es regnet nicht mehr...';
      poMessageData.file = poFilePath + 'sunshine-64.png';
      sendPoMessage();
    }
  }
}

/**
 * This TypeScript function uses a POST request to retrieve data from the Mobile Alerts server and update 
 * the data in the ioBroker object database. If it is data from a rain sensor, it will check if it is raining.
 */
async function getData() {
  const data = await doPostRequest();
  // log(data);
  if (data) {
    const obj = JSON.parse(data);
    if (obj.success == true) {
      obj.devices.forEach(function (item: any) {
        let props = propertiesById.get(item.deviceid);
        for (var [key, subitem] of props.data) {
          let value = checkDefined(item.measurement[key], subitem.type);
          subitem.maItem === true && setState(mobileAlertsPath + item.deviceid + "." + key, value, true);
          key === 'rf' && checkForRain(item.deviceid, item.measurement[key]); // check flipcounter if key is = 'rf'
        }
      });
    } else {
      log('Mobile Alerts: Received object contains error "' + obj.errorcode + '": ' + obj.errormessage, 'error');
    }
  } else {
    log('Mobile Alerts: Requested data string is empty!', 'warn');
  }
};

/* The  following line is scheduling the `getData` function to run every 2 minutes.  `schedule` is a 
built-in function in ioBroker that allows you to schedule the execution of a function at specific intervals or times. 
In this case, the `getData` function will be called every 2 minutes to retrieve data from the Mobile Alerts server 
and update the data in the ioBroker object database. */

schedule('*/2 * * * *', getData);
