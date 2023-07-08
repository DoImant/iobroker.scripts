//
// Berechnung das Taupunktes aus Temperatur und rel. Luftfeuchte
//
// 03.06.2023 Initiale Version
// 18.06.2023 An neue Datenpunktstruktur für die SensEgg Sensoren angepasst
// 

/* 
Quelle: https://www.wetterochs.de/wetter/feuchte.html

Die Grundlage der Berechnungen ist die Näherungsformel für den Sättigungsdampfdruck ( Gleichung 1 ), 
die sogenannte Magnusformel. Die relative Luftfeuchtigkeit ist definiert als das Verhältnis vom augenblicklichen 
Dampfdruck zum Sättigungsdampfdruck (umgeformte Gleichung 2). Bei der Taupunkttemperatur ist definitionsgemäß der 
Sättigungsdampfdruck gleich dem aktuellen Dampfdruck. Aus diesen beiden Definitionen folgt unmittelbar Gleichung 3, 
die Formel zur Berechnung der relativen Luftfeuchtigkeit aus der Taupunkttemperatur. 

Die 4. Gleichung beschreibt umgekehrt die Berechnung der Taupunkttemperatur aus der relativen Luftfeuchtigkeit und 
der aktuellen Temperatur. Diese 4. Gleichung ist im Grunde nichts anderes als die nach T aufgelöste 1. Gleichung , 
wobei für den Sättigungsdampfdruck der aktuelle Dampfdruck (und nicht der aktuelle Sättigungsdampfdruck) eingesetzt 
wird, so dass die Taupunkttemperatur und nicht die normale Temperatur als Ergebnis herauskommt. 
Aus der allgemeinen Gasgleichung ergibt sich die 5. Gleichung .

Bezeichnungen:
r = relative Luftfeuchte
t = Temperatur in °C
tk = Temperatur in Kelvin (TK = T + 273.15)
td = Taupunkttemperatur in °C
DD = Dampfdruck in hPa
SDD = Sättigungsdampfdruck in hPa

Parameter:
a = 7.5, b = 237.3 für T >= 0
a = 7.6, b = 240.7 für T < 0 über Wasser (Taupunkt)
a = 9.5, b = 265.5 für T < 0 über Eis (Frostpunkt)

R* = 8314.3 J/(kmol*K) (universelle Gaskonstante)
mw = 18.016 kg/kmol (Molekulargewicht des Wasserdampfes)
AF = absolute Feuchte in g Wasserdampf pro m3 Luft

Formeln:
SDD(t) = 6.1078 * 10^((a*t)/(b+t))
DD(r,t) = r/100 * SDD(t)
r(t,TD) = 100 * SDD(td) / SDD(t)
td(r,t) = b*v/(a-v) mit v(r,t) = log10(DD(r,t)/6.1078)
AF(r,tk) = 10^5 * mw/R* * DD(r,t)/tk; AF(td,tk) = 10^5 * mw/R* * SDD(td)/tk
*/

// import { setSensIDState } from "../global/helper/setSensIDState";

//
// Testcode
//
// let t = 21.5  // temperature
// let r = 40.0  // rel. humidity
// console.log("Taupunkt: " + roundTo(calcRHtoDP(t, r), 2))
// console.log("Abs. Feuchte in g/m³: " + roundTo(calAbsHumidity(t, r), 2))

function getParameters(temperature: number): [a:number, b:number]  {
  // Parameter:
  // a = 7.5, b = 237.3 für T >= 0
  // a = 7.6, b = 240.7 für T < 0 über Wasser (Taupunkt)
  return (temperature < 0) ? [7.6, 240.7] : [7.5, 237.3];
}

// Sättingungsdampfdruck in Abhängigkeit von der Temperatur
// Saturation vapor pressure as a function of temperature
function calcSDD(t: number): number {
  const [a,b] = getParameters(t);
  return 6.1078 * Math.pow(10,(a * t) / (b + t));
}

// Dampfdruck in Abhängigkeit von der Temperatur und der relativen Feuchte
// Vapor pressure as a function of temperature and relative humidity
function calcDD(t: number, r: number): number {
  let sdd = calcSDD(t);
  return r / 100 * sdd;
}

function calcRHtoDP(t: number, r: number): number {
  let dd = calcDD(t, r);
  const [a,b] = getParameters(t);
  // TD(r,T) = b*v/(a-v) mit v(r,T) = log10(calcDD(r,T)/6.1078)
  let v = Math.log10(dd / 6.1078);
  return (b * v) / (a - v);
}

function calAbsHumidity(t: number, r: number): number {
  var mw = 18.016;      // 18.016 kg/kmol (Molekulargewicht des Wasserdampfes)
  var ugc = 8314.3;     // 8314.3 J/(kmol*K) (universelle Gaskonstante)
  var dd = 100 * calcDD(t, r);
  return 1000 * mw / ugc * dd / (t + 273.15);
}

//
// ioBroker 
//
function calcDewPoint(tpId: string, index: number): void {
  const devBaseString = '0_userdata.0.sensEgg.Devices.';  
  const myRegEx = new RegExp("^.*(\\d{3})");
  let rgxResult = myRegEx.exec(tpId);
  if (rgxResult) {
    let rhId = devBaseString + rgxResult[1] + '.raH';
    let dpId = devBaseString + rgxResult[1] + '.dPt';
    let ahId = devBaseString + rgxResult[1] + '.aaH';
    // Parameters: getState(tpId).val = temperature, getState(rhId).val = air humidity 
    let dewPoint = roundTo(calcRHtoDP(getState(tpId).val, getState(rhId).val), 2);
    let absHumidity = roundTo(calAbsHumidity(getState(tpId).val, getState(rhId).val), 2);
    // console.log("ID: " + dpId + "Taupunkt: " + dewPoint);
    setState(dpId, dewPoint, true);
    setState(ahId, absHumidity, true);
  }
}

// Schedule at any temperature change
// on({ tpId: /^0_userdata\.0\.sensEgg\.Device\.\d{3}\.ntcT$/, change: "ne" }, calcDewPoint);

// Schedule every 10 minutes for all sensors
schedule('*/10 * * * *', () => {
  // Determine all temperature sensor IDs    
  $('state[id=0_userdata.0.sensEgg.Devices.*.ntcT]').each(calcDewPoint);
});

