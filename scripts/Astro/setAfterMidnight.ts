//
// Set the after midnight flag to "true" for the time representation in the sun position widget(vis).
// If true, then the time changes from tomorrow to today (sunrise)  and from "Today" to "Yesterday" (sunset).
//
// Execution 0 o'clock 0 and 5 seconds
//

schedule('5 0 0 * * *', () => {
  setState('0_userdata.0.Var.sonne.nachMitternacht',true,true);  
});