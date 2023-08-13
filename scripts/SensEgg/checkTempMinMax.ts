// 
// Determine and store the min/max temperatures of a day
//
// 25.05.2023 Initial version
// 28.05.2023 Function setSensIDState moved to its own script in global/helper.
// 18.06.2023 Adapted to new data point structure for SensEgg sensors. 
//            setSensIDState no lnger used
//

on({ id: /^0_userdata\.0\.sensEgg\.Devices\.\d{3}\.ntcT$/, change: "ne" }, checkTemperature);

function checkTemperature(obj: any): void {
  const devBaseString = obj.id.replace(/ntcT$/, ''); 

  const tMaxID = `${devBaseString}tMax`;
  const tMinID = `${devBaseString}tMin`;
  let tMaxVal = getState(tMaxID).val;
  let tMinVal = getState(tMinID).val;
  // If the measured temperature is > than the currently stored maximum value, 
  // store the new value as maximum
  if (obj.state.val > tMaxVal) {
    const tsMaxID = `${devBaseString}tsMax`;
    setState(tMaxID, obj.state.val, true);
    setState(tsMaxID, obj.state.ts, true);
  } else if (obj.state.val < tMinVal) {
    // If the measured temperature is < than the currently saved minimum value, 
    // save the new value as minimum
    const tsMinID = `${devBaseString}tsMin`;
    setState(tMinID, obj.state.val, true);
    setState(tsMinID, obj.state.ts, true);
  }
} 
