## What can be found here?

In this repository are scripts that I use in ioBroker. At the moment the script collection is limited to the processing of data received from my SensEgg sensors ([See what SensEgg is](https://www.arduinoforum.de/arduino-Thread-SensEgg-light-FunkSensor-ATtiny814-nRF24-BME280-NTC)) and a Mobile Alerts rain gauge (MA 10650).

Data retrieval of the rain gauge is done via the [Mobile Alerts REST API](https://mobile-alerts.eu/info/public_server_api_documentation.pdf).

To access the Mobile Alerts REST API, the module node-fetch is used, which must be installed for use with ioBroker. With the following instructions this can be done via a terminal:

```
cd /opt/iobroker/node_modules
sudo npm install node-fetch@2 --unsafe-perm
chown -R iobroker:iobroker node-fetch
```

The code for the SensEgg sensor and the serial gateway to ioBroker can be found here:
[Code for SensEgg Sensor and receiver (serial gateway)](https://github.com/DoImant/Arduino-SensEgg-Light).

Display of three SensEgg sensors using ioBroker VIS.
![Screenshot ioBroker VIS](https://github.com/DoImant/Stuff/blob/main/SensEgg-Light/sensEgg-VIS.jpg?raw=true)
