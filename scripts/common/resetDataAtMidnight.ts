//
// Reset some data fields to specific values at midnight.
//
// 03.06.2023 Initial version
// 18.06.2023 Adapted to new data point structure for SensEgg sensors
// 24.06.2023 Script renamed and some functions merged into this script. 
// 09.07.2023 resetRainfall() id changed from rsd to rst.
// 22.07.2023 resetMinMax simplified
//

//
// At midnight, set the min/max settings to the current temperature values
//
function resetMinMaxT(id: string): void {
  const devBaseString = id.replace(/ntcT$/,'');
  const tMaxID = `${devBaseString}tMax`;
  const tMinID = `${devBaseString}tMin`;
  const tsMaxID = `${devBaseString}tsMax`;
  const tsMinID = `${devBaseString}tsMin`;
  const ts: number = new Date().getTime();

  if (existsState(tMaxID) && existsState(tMinID)) {
    setState(tMaxID, getState(id).val, true);
    setState(tMinID, getState(id).val, true);
    setState(tsMaxID, ts, true);
    setState(tsMinID, ts, true);
  }
}

//
// Set the after midnight flag to "true" for the time representation in the sun position widget(vis).
// If true, then the time changes from tomorrow to today (sunrise)  and from "Today" to "Yesterday" (sunset).
//
function resetSunRiseInfo(): void {
  setState('0_userdata.0.Var.sonne.nachMitternacht', true, true);
}

//
// Reset rainfall amount every midnight.
//
function resetRainfall() {
  $('state[id=0_userdata.0.mobileAlerts.Devices.*.rst]').each((id: string) => {
    // reset rst and rsd value only when it is not raining
    // rb is "it's raining true or false"
    if (!getState(id.replace(/rst$/g, 'rb')).val) {
      setState(id, 0, true);
      setState(id.replace(/t$/g, 'd'), 0, true);
    }
  });
}

schedule('0 0 * * *', () => {
  // Determine all temperature sensor IDs    
  $('state[id=0_userdata.0.sensEgg.Devices.*.ntcT]').each(resetMinMaxT);

  // Reset time information.
  resetSunRiseInfo();

  resetRainfall();
});
