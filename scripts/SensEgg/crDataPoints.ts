//
// Anlegen der Datenpunkte für den Betrieb des SensEgg Sensors zur Erfassung von 
// Temperatur, Luftfeuchte und Luftdruck Daten mit ioBroker
// https://www.arduinoforum.de/arduino-Thread-SensEgg-light-FunkSensor-ATtiny814-nRF24-BME280-NTC
//
// 18.06.2023 initiale Version
//

const sensEggPath = '0_userdata.0.sensEgg.Devices.';  //Datenpunkte werden in diesem Pfad erzeugt.

const dataPoints = new Map([
  ['T', { name: 'Temperatur', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['raH', { name: 'Relative Luftfeuchte', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['aP', { name: 'Luftdruck', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['ntcT', { name: 'NTC Temperatur', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['btVt', { name: 'Batterie Spannungen', type: 'array', role: 'value', iValue: [2.65, 2.45], unit: '' }],
  ['btVcc', { name: 'Batterie Spannung', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['btIcon', { name: 'Icon Index', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['tMin', { name: 'Minimaltemperatur', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['tMax', { name: 'Maximaltemperatur', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['tsMin', { name: 'Zeitpunkt Minimaltemperatur', type: 'number', role: 'value.time', iValue: 0, unit: '' }],
  ['tsMax', { name: 'Zeitpunkt Maximaltemperatur', type: 'number', role: 'value.time', iValue: 0, unit: '' }],
  ['dPt', { name: 'Taupunkt', type: 'number', role: 'value', iValue: 0, unit: '' }],
  ['aaH', { name: 'Absolute Luftfeuchte', type: 'number', role: 'value', iValue: 0, unit: '' }]]);

// Hier werden für jede Geräte-Id der Name und die zu benötigten Datenpunkte festgelegt.
let sePropertyArray = [{ id: '201', name: 'Sensor Garten', data: dataPoints },
{ id: '202', name: 'Sensor Wohnbereich', data: dataPoints },
{ id: '203', name: 'Sensor Arbeitszimmer', data: dataPoints }];

//
// Anlegen der Datenpunkte in ioBroker
//
sePropertyArray.forEach(function (item) {
  item.data.forEach(function (subitem: any, key) {
    let id = sensEggPath + item.id + '.' + key;
    //console.log(id);
    //console.log(subitem);

    if (!existsObject(id)) {
      createState(
        id,
        subitem.iValue,
        {
          'name': subitem.name,
          'type': subitem.type,
          'unit': subitem.unit,
          'read': true,
          'write': true,
          'role': subitem.role
        });
    }
  });
});
