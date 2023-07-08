//
// Wrapper function for sending messages using the pushover service.
//
// 08.07.2023 Initial version
//
// Pushover Message interface
// https://github.com/ioBroker/ioBroker.pushover/blob/master/docs/de/README.md
// 
interface PushoverMessage {
  message: string;
  title: string;
  sound?: string;
  file?: string;
}

/**
 * The function sends a message using the Pushover service if the remaining limit is available.
 * @param {any} msgObj - The `msgObj` parameter is an object that contains the data for the message that you want to send
 * to the Pushover service. If the pushover service is not installed or the message limit is exceeded, 
 * nothing will be executed. 
 */
export async function sendPoMessage(msgObj: PushoverMessage) {
  const poID = 'pushover.0.app.remainingLimit';
  if (existsObject(poID) && getState(poID).val) {
    sendTo('pushover', msgObj);
  }
}
