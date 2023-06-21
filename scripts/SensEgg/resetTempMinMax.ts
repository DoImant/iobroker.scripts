//
// Um Mitternacht die Min-/Max Einstallungen auf die aktuellen Temperaturwerte setzen
//
// 03.06.2023 Initial Version
// 18.06.2023 An neue Datenpunktstruktur für die SensEgg Sensoren angepasst
//
const devBaseString = '0_userdata.0.sensEgg.Device.';

schedule('0 0 * * *', () => {
  // Determine all temperature sensor IDs    
  $('state[id=0_userdata.0.sensEgg.Device.*.ntcT]').each(reset);
});

function reset(id: string, i: number):void {
  // Templatestring for all max, min IDs
  const myRegEx = new RegExp("^.*(\\d{3})");
  let rgxResult = myRegEx.exec(id);   // crop sensorID number from id
  let ts: number = new Date().getTime();
  if (rgxResult) {
    let tMaxID = devBaseString + rgxResult[1] + ".tMax";
    let tMinID = devBaseString + rgxResult[1] + ".tMin";
    let tsMaxID = devBaseString + rgxResult[1] + '.tsMax'
    let tsMinID = devBaseString + rgxResult[1] + '.tsMin'
    if (existsState(tMaxID) && existsState(tMinID)) {
      setState(tMaxID, getState(id).val, true);
      setState(tMinID, getState(id).val, true);
      setState(tsMaxID, ts, true);
      setState(tsMinID, ts, true);
    }
  }
}
