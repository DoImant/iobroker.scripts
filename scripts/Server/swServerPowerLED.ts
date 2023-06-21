// 
// Schalte die PowerLED des Rapberry Pi an oder aus.(Erfolgt über VIS Buttons)
// Beim starten von ioBroker wird der zuletzt gespeicherte Status ausgelesen und
// entsprechend gesetzt.
//
function switchOn() {
  log('Schalte Raspberry Power-LED ein', 'info');
  exec('echo 1 | sudo tee /sys/class/leds/PWR/brightness');
}

function switchOff() {
  log('Schalte Raspberry Power-LED aus', 'info');
  exec('echo 0 | sudo tee /sys/class/leds/PWR/brightness');
}

function checkLedState() : void {
  getState('0_userdata.0.Server.powerLed').val === 0 ? switchOff() : switchOn();
}

// Check beim Start des Systems
checkLedState();

// Check bei Änderung des Objekts
on({ id: '0_userdata.0.Server.powerLed', change: 'any' }, checkLedState);
