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
// 08.07.2023 Removed the sendPoMessage function and moved it to a typescript file in the global scope of ioBroker-JS.
// 09.07.2023 Revised the way the daily rainfall amount is determined and stored.
// 20.07.2023 Different handling of global data
// 27.07.2023 The rain end detection (maxRainTrueResetCounter) set high fom 5 to 10
//
// @ts-ignore
const fetch = require('node-fetch');

// @ts-ignore
const maDeviceID = require('/opt/iobroker/iobroker-data/include/credentials.ts'); //My  Device ID, not published

//
// Interfaces for global data
//
interface MobileAlertsData {
  readonly path: string;
  readonly apiURL: string;
  readonly phoneID: string;
  apiBody: string;
  readonly imgFilePath: string;
}

interface Precipitation {
  readonly rafc: number;
  readonly maxRainTrueResetCounter: number;
  rainTrueResetCounter: number;
  isNewStarted: boolean;
}

const MA_DATA: MobileAlertsData = {
  path: '0_userdata.0.mobileAlerts.Devices.',
  apiURL: 'https://www.data199.com/api/pv1/device/lastmeasurement',
  phoneID: '',
  apiBody: '',
  imgFilePath: '/opt/iobroker/iobroker-data/include/img/'
};

const MA_PRECIP: Precipitation = {
  rafc: 0.258,
  // Maximum counter value
  // With a query interval of the API of two minutes, the reset occurs after maxRainTrueResetCounter * 2 minutes  
  maxRainTrueResetCounter: 10,
  // If the rain flag (rb) = true but the flip counter value does not change anymore, this counter is 
  // incremented to the maximum value before the rain flag is set to false again. 
  rainTrueResetCounter: 0,
  isNewStarted: true   //Status variable for a test whether this script has just been restarted.
};

/* Example temperature sensor
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
/* 
let propertyArray = [
{ id: '0301548CBC4A', name: 'Sample Sensor Berlin', data: measurement02 },
{ id: '08004EA0B619', name: 'Sample Rainsensor', data: measurement08 }];
*/
let propertyArray = [{ id: maDeviceID, name: 'Regensensor', data: measurement08 }];

// Auxiliary function for checkForRain().
// Check if two Dates (timestamps) are on the same Day
function datesAreOnSameDay(first: Date, second: Date): boolean {
  const result = first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();

  log(first.toDateString() + " / " + second.toDateString() + " " + result);
  return result;
}

// This code block is creating a string called `deviceIdString` which will contain all the device IDs from the
// `propertyArray`. It also creates a `propertiesById` map to store the properties of each device ID. 
// The deviceidString is needed for the API query to retrieve the data for all sensors stored in the propertyArray.
//
// Example Device ID  -> deviceids=0E7EA4A71203,09265A8A3503&phoneid=880071013613
// The phoneid must be specified if alarms configured in the app are also to be delivered
let deviceIdString = '';
var propertiesById = new Map();
propertyArray.forEach(function (item) {
  propertiesById.set(item.id, item);
  deviceIdString += item.id + ',';
})
deviceIdString = deviceIdString.replace(/,$/, '');   // remove trailing comma
MA_DATA.apiBody = (!MA_DATA.phoneID) ?
  `deviceids=${deviceIdString}` : `deviceids=${deviceIdString}\&phoneid=${MA_DATA.phoneID}`;

// This code block is iterating over each item in the `propertyArray` array. For each item, it then iterates over the
// `data` property of that item. If the corresponding objects do not yet exist in the iobroker object database, 
// they will be created.
propertyArray.forEach(function (item) {
  item.data.forEach(function (subitem: any, key) {
    let id = `${MA_DATA.path}${item.id}.${key}`;
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
async function doPostRequest(url: string, body: string): Promise<string> {
  let result = '';
  try {
    const response = await fetch(url, {
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
function checkDefined(value: number | boolean, dataType: string): number | boolean {
  if (value === undefined) {
    switch (dataType) {
      case 'number': value = 0; break;
      case 'boolean': value = false; break;
    }
  }
  return value;
}

/**
 * The function `checkForRain` checks if it is currently raining based on the rainfall values received from a device, and
 * updates the state accordingly.
 * @param {MobileAlertsData} mad - The `mad` parameter is of type `MobileAlertsData` and represents the data related to
 * Mobile Alerts.
 * @param {Precipitation} precip - The `precip` parameter is an object that contains information about precipitation. It
 * has the following properties:
 * @param {string} deviceID - The `deviceID` parameter is a string that represents the ID of the device for which we are
 * checking for rain.
 * @param {number} rfVal - The `rfVal` parameter represents the current flip counter value, which is used to track
 * rainfall.
 * @param {number} tsVal - The `tsVal` parameter represents the timestamp value, which is a numeric value representing the
 * time in seconds since January 1, 1970. It is used to determine if a day change has occurred.
 * @returns The function does not return anything. It has a return type of `void`, which means it does not return any
 * value.
 */
function checkForRain(mad: MobileAlertsData,
  precip: Precipitation,
  deviceID: string,
  rfVal: number,
  tsVal: number): void {
  const basePath = `${mad.path}${deviceID}`;
  const lrfID = `${basePath}.lrf`;
  const rbID = `${basePath}.rb`;
  const rsdID = `${basePath}.rsd`;
  const rstID = `${basePath}.rst`;

  const dateTsVal = new Date(tsVal * 1000);

  // If the script has just been restarted, set the saved flip count value equal to the submitted one.
  // If rfVal = 0, this value was reset and it doesn't rain.
  if (precip.isNewStarted || !rfVal) {
    setState(lrfID, rfVal, true);
    precip.isNewStarted = false;
    log('maGetData: The script was just restarted or rf was reset to zero ');
    return;
  }

  let itIsRaining = getState(rbID).val;
  let lrfVal = getState(lrfID).val;
  let rfDiff = rfVal - lrfVal;   // no rain if result is zero.
  if (rfDiff > 0) {   // if the flipcounter is not equal to the stored counter, it must be raining.
    precip.rainTrueResetCounter = 0;
    let rasd = rfDiff * precip.rafc;   // Rainfall amount since last data request.
    let rainTotal = getState(rstID);
    // If a day change has occurred, then do not save the total but the current rain value.
    rainTotal.val = (datesAreOnSameDay(new Date(rainTotal.ts || 0), dateTsVal))  ? rainTotal.val + rasd : rasd;
    setState(lrfID, rfVal, true);       // save actual flip counter value
    setState(rsdID, rasd, true);        // save rainamount since last data request
    setState(rstID, rainTotal, true);   // save total rain amount per day 
    if (!itIsRaining) {
      setState(rbID, true, true);       // set rb = true (it is raining)
      log('It\'s raining!');
      sendPoMessage({
        message: 'Es ist am regnen...', title: 'Mobile Alerts', sound: 'pushover',
        file: mad.imgFilePath + 'umbrella-64.png'
      });
    }
  } else if (itIsRaining) {
    ++precip.rainTrueResetCounter;
    log(`Tests for rain end (${precip.rainTrueResetCounter}/${precip.maxRainTrueResetCounter})`);
    // If a day change occurred, then set rainsumtotal (rst) to 0
    if (!datesAreOnSameDay(new Date(), dateTsVal)) {
      setState(rstID, 0, true);
      log('Daychange: Reset Rain Sum Total');
    }
    if (precip.rainTrueResetCounter >= precip.maxRainTrueResetCounter) {
      log('It no longer rains');
      setState(rsdID, 0, true);
      setState(rbID, false, true);
      sendPoMessage({
        message: 'Es regnet nicht mehr...', title: 'Mobile Alerts', sound: 'pushover',
        file: mad.imgFilePath + 'sunshine-64.png'
      });
    }
  }
}

/**
 * This TypeScript function uses a POST request to retrieve data from the Mobile Alerts server and update 
 * the data in the ioBroker object database. If it is data from a rain sensor, it will check if it is raining.
 */
async function getData() {
  const data = await doPostRequest(MA_DATA.apiURL, MA_DATA.apiBody);
  // log(data);
  if (data) {
    const obj = JSON.parse(data);
    if (obj.success === true) {
      obj.devices.forEach(function (item: any) {
        let props = propertiesById.get(item.deviceid);
        for (var [key, subitem] of props.data) {
          let value = checkDefined(item.measurement[key], subitem.type);
          subitem.maItem === true && setState(`${MA_DATA.path}${item.deviceid}.${key}`, value, true);
          // check for rain if key is = 'rf'
          key === 'rf' &&
            checkForRain(MA_DATA, MA_PRECIP, item.deviceid, item.measurement[key], item.measurement['ts']);
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
