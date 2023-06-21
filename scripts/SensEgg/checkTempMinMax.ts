// 
// Ermitteln und speichern der min/max Temperaturen eines Tages
//
// 25.05.2023 Initiale Version
// 28.05.2023 Function setSensIDState in eigenes Script in global/helper ausgelagert.
// 18.06.2023 An neue Datenpunktstruktur für die SensEgg Sensoren angepasst
//

// import { setSensIDState } from "../global/helper/setSensIDState";

on({ id: /^0_userdata\.0\.sensEgg\.Device\.\d{3}\.ntcT$/, change: "ne" }, checkTemperature);

function checkTemperature(obj: any): void {
  const devBaseString: string = '0_userdata.0.sensEgg.Device.';
  const myRegEx = new RegExp("^.*(\\d{3})");

  let rgxResult = myRegEx.exec(obj.id);
  if (rgxResult) {
    let tMaxID = devBaseString + rgxResult[1] + '.tMax';
    let tMinID = devBaseString + rgxResult[1] + '.tMin';
    let tMaxVal = getState(tMaxID).val;
    let tMinVal = getState(tMinID).val;
    // If the measured temperature is > than the currently stored maximum value, 
    // store the new value as maximum
    if (obj.state.val > tMaxVal) {
      let tsMaxID = devBaseString + rgxResult[1] + '.tsMax'
      setSensIDState(tMaxID, obj.state.val, 'value', true);
      setSensIDState(tsMaxID, obj.state.ts, 'value.time', true);
    } else if (obj.state.val < tMinVal) {
      // If the measured temperature is < than the currently saved minimum value, 
      // save the new value as minimum
      let tsMinID = devBaseString + rgxResult[1] + '.tsMin'
      setSensIDState(tMinID, obj.state.val, 'value', true);
      setSensIDState(tsMinID, obj.state.ts, 'value.time', true);
    }
  }
} 