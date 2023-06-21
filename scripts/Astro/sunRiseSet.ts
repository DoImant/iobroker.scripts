//
// Set at sunrise time the new time for sunset of the current day and sunrise of the next day.
//
// The flag "nachMitternach", which is important for the time on the VIS page, is set to false.
//
const SUNRISE_ID = '0_userdata.0.Var.sonne.aufgang';
const SUNSET_ID = '0_userdata.0.Var.sonne.untergang';
const MIDNIGHT_ID = '0_userdata.0.Var.sonne.nachMitternacht';

//schedule('0 5 * * *', () => {
schedule({ astro: 'sunrise', shift: 10 }, () => {
  let sunset = getAstroDate('sunset');
  log("Sonnenuntergang heute um: " + sunset);

  // let tomorrow = new Date(sunset.getFullYear(), sunset.getMonth(), sunset.getDate() + 1);
  let tomorrow = new Date(sunset).getTime() + (86400000);
  let tomorrowSunrise = getAstroDate('sunrise', tomorrow);
  log('Sonnenaufgang morgen um: ' + tomorrowSunrise);
  setState(SUNSET_ID, sunset.getTime(), true);
  setState(SUNRISE_ID, tomorrowSunrise.getTime(), true);
  setState(MIDNIGHT_ID, false, true);
});