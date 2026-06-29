import * as shadowfax from './shadowfaxService.js';
import * as frontline from './frontlineService.js';  // when ready
import * as hilift from './hiliftService.js';      // when ready

const providers = {
  shadowfax,
  frontline,
  hilift,
};

export const getCarrier = (provider) => {
  const carrier = providers[provider];
  if (!carrier) throw new Error(`Carrier provider "${provider}" is not configured`);
  return carrier;
};