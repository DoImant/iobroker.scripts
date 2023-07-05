//
// Calculate the daily rainfall total. This script is triggered when the value 
// of the object ID 0_userdata.0.mobileAlerts.Devices.<DeviceID>.rsd is updated.
//
// 05.07.2023 Initial version
//

function rainTotalDaily(obj: any) {
  let tsTo = new Date(obj.state.ts);
  let tsFrom = new Date(tsTo.getTime());
  tsFrom.setHours(0, 0, 0, 0); // Set Date - Time to midnight

  const myQuery = 'SELECT sum(val) as total FROM iobroker.ts_number \
    WHERE id=(select id from iobroker.datapoints where name=\''+ obj.id + '\') \
    AND ts BETWEEN '+ tsFrom.getTime() + ' AND ' + tsTo.getTime() + ';';

  sendTo('sql.0', 'query', myQuery, function (rs) {
    if (rs.error) {
      console.error(rs.error);
    } else {
      const rstID: string = obj.id.replace(/rsd$/g, 'rst');
      let sum = JSON.parse(JSON.stringify(rs.result[0]));
      // Select only sums up to the penultimate value. Therefore the current value must be added here.
      sum.total += obj.state.val;
      sum.total = roundTo(sum.total, 3);
      setState(rstID, sum.total, true);
    }
  });
}

on({ id: /^0_userdata\.0\.mobileAlerts\.Devices\.\w{12}\.rsd$/, change: 'any' }, rainTotalDaily);