//
// Determine the charge level of the batteries,
// The btVt datapoint contains limit values for charge states.
// The datapoint btIcon contains an index for displaying the appropriate 
// battery icon (depending on the state of charge) for the display in VIS.
//
// 03.06.2023 Initial version
// 18.06.2023 Adapted to new data point structure for SensEgg sensors
// 23.07.2023 Script simplified
//

function checkBattery(obj: any): void {
  const devBaseString = obj.id.replace(/btVcc$/, '');

  let indicator = 0;
  let comp = getState(`${devBaseString}btVt`);
  for (let value of comp.val) {
    if (obj.state.val > value) { break; } // obj.val from id *.btVcc
    ++indicator;
  }
  // log(`${devBaseString}btVt index: ${obj.state.val} ${comp.val} ${indicator}`);
  setState(`${devBaseString}btIcon`, indicator, true);  // set icon index 0 full, 1 medium, 2 empty
}

on({ id: /^0_userdata\.0\.sensEgg\.Devices.\d{3}\.btVcc$/, change: "ne" }, checkBattery);