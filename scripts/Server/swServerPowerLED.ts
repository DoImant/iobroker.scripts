// 
// Switch the PowerLED of the Rapberry Pi on or off (via VIS buttons).
// When ioBroker is started, the last saved status is read and set accordingly. 
//
// 21.06.2023 Initial version
// 12.07.2023 Change to make the script work even if the option "Do not subscribe all states on start" is set.
//
function switchOn() {
  log('Schalte Raspberry Power-LED ein', 'info');
  exec('echo 1 | sudo tee /sys/class/leds/PWR/brightness');
}

function switchOff() {
  log('Schalte Raspberry Power-LED aus', 'info');
  exec('echo 0 | sudo tee /sys/class/leds/PWR/brightness');
}

async function checkLedState(): Promise<void> {
  const res = await getStateAsync('0_userdata.0.Server.powerLed');
  res.val === 0 ? switchOff() : switchOn();
}

// Check at system startup
checkLedState();

// Check when the object is changed
on({ id: '0_userdata.0.Server.powerLed', change: 'any' }, checkLedState);
