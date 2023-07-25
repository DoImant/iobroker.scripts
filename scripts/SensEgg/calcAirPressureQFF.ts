//
// Calculation of air pressure at sea level (NN) using the barometric altitude formula
//
// 25.05.23 initial Version
//

///////////////////////////////////////////////
// Constants
///////////////////////////////////////////////
const HOEHE = 132;     // Height of the sensor in meters above sea level
const TEMPERATURE_ID = 'alias.0.klima.garten.temperatur';
const AIRPRESSUREQFE_ID = 'alias.0.klima.garten.luftdruck';
const AIRPRESSUREQFF_ID = '0_userdata.0.Var.luftdruck.QFF';

const DEZIMALS = 2;
const KELVIN = 273.15;             // 0° Kelvin
const T_GRADIENT = 0.0065;
const EXPONENT_N = -5.255;         // -0.03416 / T_GRADIENT;
const EXPONENT_P = EXPONENT_N * -1;
const HT_GRADIENT = HOEHE * T_GRADIENT;

///////////////////////////////////////////////
// Code
///////////////////////////////////////////////
// Every 15th minute
schedule('*/15 * * * *', function () {
  // Simple form without act. temperature
  //let apQFF: number = (getState(AIRPRESSUREQFE_ID).val / (Math.pow(1.0 - (HOEHE / 44330.0), EXPONENT_P)));

  // More complicated with actual temperature 
  let temperatureK = getState(TEMPERATURE_ID).val + KELVIN;
  let apQFF = getState(AIRPRESSUREQFE_ID).val * Math.pow((temperatureK / (temperatureK + HT_GRADIENT)), EXPONENT_N);
  apQFF = roundTo(apQFF, DEZIMALS);
  setState(AIRPRESSUREQFF_ID, apQFF, true);
});



