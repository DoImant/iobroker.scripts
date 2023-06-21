//
// Berechnung der Luftdruckdifferenz von einer und drei Stunden
//
// 25.05.23
//

const numSelect: number = 3;

//
// Differenz von einer Stunde errechnen und speichern
//
on({ id: '0_userdata.0.Var.luftdruck.QFF', change: 'any' }, function (obj) {
  let tsFrom = new Date(obj.state.ts);
  // Don't do anything unless the time is a full hour.
  if (tsFrom.getMinutes() != 0) { return; }   // RETURN !!!

  tsFrom.setSeconds(0, 0);                     // set seconds + millsec to zero
  let tsTo = new Date(tsFrom.setHours(tsFrom.getHours() - 1));
  tsTo.setSeconds(1);
  // log('start query from: ' + tsFrom + ' to ' + tsTo);
  sendTo('sql.0', 'getHistory', {
    id: obj.id,
    options: {
      start: tsFrom,
      end: tsTo,
      round: 2,
      ignoreNull: true,
      returnNewestEntries: true,
      aggregate: 'none'
    }
  }, function (rs: { result: string | any[]; }) {
    let qffDiff1h: number = 0;
    if (!rs.result[0]) {
      log("No Result...", 'warn');
    } else {
      qffDiff1h = roundTo(obj.state.val - rs.result[0].val, 2);
      //log('Result: ' + qffDiff1h + 'hPa');
    }
    setState('0_userdata.0.Var.luftdruck.diff_1std', qffDiff1h, true);
  });
});

//
// Wenn ein neuer Wert (Stundendifferenz) gespeichert wurde, selektiere die 
// letzten drei Differenzwerte und addiere sie
//
on({ id: '0_userdata.0.Var.luftdruck.diff_1std', change: 'any' }, function (obj) {
  sendTo('sql.0', 'getHistory', {
    id: obj.id,
    options: {
      limit: numSelect,
      round: 2,
      ignoreNull: true,
      returnNewestEntries: true,
      aggregate: 'none'
    }
  }, doResult);
});

function doResult(rs: { result: string | any[]; }) {
  let sum: number = 0;
  if (!rs.result[0]) {
    log("No Result...", 'warn');
  } else if (rs.result.length === numSelect) { // Calculate the sum only if the required number of records could be loaded.
    for (let resData of rs.result) {
      //log(' Wert: ' + resData.val);
      sum += resData.val
    }
    sum = roundTo(sum, 2);
  }
  setState('0_userdata.0.Var.luftdruck.diff_3std', sum, true);
}

