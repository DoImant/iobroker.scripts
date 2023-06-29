//
// Ladestand der Batterien ermitteln,
// Der Datenpunkt btVt enthält Grenzwerte für Ladungszustände
// Der Datenpunkt btIcon enthält einen Index für die Anzeige des passenden Batteriesymbols (je nach Ladezustand)
// für die Anzeige in VIS.
// 
// 03.06.2023 Initiale Version
// 18.06.2023 An neue Datenpunktstruktur für die SensEgg Sensoren angepasst
//
on({ id: /^0_userdata\.0\.sensEgg\.Devices.\d{3}\.btVcc$/, change: "ne" }, checkBattery);

function checkBattery(obj: any): void {
  const devBaseString = '0_userdata.0.sensEgg.Devices.'; 
  const myRegEx = new RegExp("^.*(\\d{3})");

  let rgxResult = myRegEx.exec(obj.id);
  if (rgxResult) {
    let indicator = 0;
    let battData = devBaseString + rgxResult[1] + '.btVt';
    let iconId = devBaseString + rgxResult[1] + '.btIcon';
    let comp = getState(battData);
    for (let value of comp.val) {
      if (obj.state.val > value) { break; } // obj.val from id on *.sne.vcc
      ++indicator;
    }
    setState(iconId, indicator, true);
  }
}
