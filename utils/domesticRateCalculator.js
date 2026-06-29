/**
 * Dynamic Domestic Rate Calculator
 * Calculates shipping rates based on pickup, delivery, weight, and provider rules.
 */

const SPECIAL_KEYWORDS = [
  'jammu', 'kashmir', 'ladakh', 'uttarakhand', 'uk', 'himachal', 
  'sikkim', 'assam', 'arunachal', 'manipur', 'meghalaya', 'mizoram', 
  'nagaland', 'tripura'
];

const isSpecialLocation = (state = '', city = '') => {
  const s = state.toLowerCase();
  const c = city.toLowerCase();
  return SPECIAL_KEYWORDS.some(kw => s.includes(kw) || c.includes(kw));
};

export const calculateDomesticRate = (courierKey, weight, pickup = {}, delivery = {}) => {
  return (domesticRates) => {
    const pickupCity = (pickup.city || '').trim().toLowerCase();
    const pickupState = (pickup.state || '').trim().toLowerCase();
    const deliveryCity = (delivery.city || '').trim().toLowerCase();
    const deliveryState = (delivery.state || '').trim().toLowerCase();
    const pickupPincode = (pickup.pincode || '').trim();
    const deliveryPincode = (delivery.pincode || '').trim();

    // 1. TTE Basic Service (Shadowfax)
    if (courierKey === 'TTE_BASIC_SURFACE') {
      const doc = domesticRates.find(r => r.package === 'TTE_BASIC_SERVICE');
      if (!doc) throw new Error('No rate card found for TTE Basic Service (Shadowfax)');

      // Determine Shadowfax Zone (A, B, C_D, E)
      let zone = 'C_D'; // default Rest of India
      if (pickupCity === deliveryCity || (pickupPincode && pickupPincode === deliveryPincode)) {
        zone = 'A'; // Intra-city
      } else if (pickupState === deliveryState) {
        zone = 'B'; // Intra-state
      } else if (isSpecialLocation(deliveryState, deliveryCity) || isSpecialLocation(pickupState, pickupCity)) {
        zone = 'E'; // Special regions
      }

      // Find weight slab
      let rateRecord = null;
      if (weight <= 2) {
        rateRecord = doc.rates.find(r => r.weightRange === '0-2');
      } else if (weight <= 5) {
        rateRecord = doc.rates.find(r => r.weightRange === '2-5');
      } else if (weight <= 10) {
        rateRecord = doc.rates.find(r => r.weightRange === '5-10');
      } else {
        rateRecord = doc.rates.find(r => r.weightRange === '>');
        if (!rateRecord) {
          rateRecord = doc.rates.find(r => r.weightRange.includes('>'));
        }
      }

      if (!rateRecord) throw new Error(`No rate slab found for weight ${weight} kg`);

      const zoneBaseVal = rateRecord.zones[zone] || rateRecord.zones['C_D'];
      let baseCost = 0;
      if (weight > 10) {
        baseCost = weight * zoneBaseVal;
      } else {
        baseCost = zoneBaseVal;
      }

      // Add GST if defined (gst: 18)
      const gstPercent = doc.gst || 0;
      const finalCost = baseCost * (1 + gstPercent / 100);
      return Math.round(finalCost * 100) / 100;
    }

    // 2. TTE Advance Air & Surface (Frontline)
    if (courierKey === 'TTE_ADVANCE_AIR' || courierKey === 'TTE_ADVANCE_SURFACE') {
      const mode = courierKey === 'TTE_ADVANCE_AIR' ? 'AIR' : 'SURFACE';
      const docs = domesticRates.filter(r => r.package === courierKey && r.mode === mode);
      if (!docs.length) throw new Error(`No rate cards found for ${courierKey}`);

      let selectedDoc = null;
      const isJK = deliveryState.includes('jammu') || deliveryState.includes('kashmir') || deliveryState.includes('ladakh') ||
                   pickupState.includes('jammu') || pickupState.includes('kashmir') || pickupState.includes('ladakh');

      if (mode === 'AIR') {
        if (isJK) {
          selectedDoc = docs.find(d => d.provider === 'REST_OF_J_K_BY_AIR');
        }
        if (!selectedDoc) {
          // Default to PAN_INDIA or PAN_INDIA_BY_AIR
          selectedDoc = docs.find(d => d.provider === 'PAN_INDIA') || docs.find(d => d.provider === 'PAN_INDIA_BY_AIR') || docs[0];
        }
      } else {
        selectedDoc = docs.find(d => d.provider === 'PAN_INDIA_BY_SURFACE') || docs[0];
      }

      if (!selectedDoc) throw new Error(`No matching provider rate card found for ${courierKey}`);

      const minW = selectedDoc.minWeight || 0;
      const ratePerKg = selectedDoc.ratePerKg || 0;
      const chargedWeight = Math.max(minW, weight);
      let baseCost = chargedWeight * ratePerKg;

      const gstPercent = selectedDoc.gst || 0;
      const finalCost = baseCost * (1 + gstPercent / 100);
      return Math.round(finalCost * 100) / 100;
    }

    // 3. TTE Premium (Highlift Surface & Air)
    if (courierKey === 'TTE_PREMIUM_AIR' || courierKey === 'TTE_PREMIUM_SURFACE') {
      const doc = domesticRates.find(r => r.package === 'TTE_PREMIUM');
      if (!doc) throw new Error('No rate card found for TTE Premium (Highlift)');

      const isAir = courierKey === 'TTE_PREMIUM_AIR';
      const rateConfig = isAir ? doc.air : doc.surface;
      if (!rateConfig) throw new Error(`Rate configuration not found for mode: ${isAir ? 'air' : 'surface'}`);

      // Map City/State to Hilift Zone (1-7)
      let zone = '6'; // default Rest of India (Zone 6)

      if (pickupCity === deliveryCity || (pickupPincode && pickupPincode === deliveryPincode)) {
        zone = '1'; // INTRA CITY
      } else {
        // Search cities in zoneMapping
        let found = false;
        const mappings = doc.zoneMapping || {};
        for (const [zKey, citiesArray] of Object.entries(mappings)) {
          if (zKey === '1') continue;
          const matched = citiesArray.some(c => {
            const normC = c.trim().toLowerCase();
            // Handle state level matching for Zone 7
            if (normC === 'north_east' && (
              deliveryState.includes('assam') || deliveryState.includes('meghalaya') || 
              deliveryState.includes('tripura') || deliveryState.includes('mizoram') || 
              deliveryState.includes('manipur') || deliveryState.includes('nagaland') || 
              deliveryState.includes('arunachal') || deliveryState.includes('sikkim')
            )) return true;
            if (normC === 'j_and_k' && (deliveryState.includes('jammu') || deliveryState.includes('kashmir') || deliveryState.includes('ladakh'))) return true;
            if (normC === 'uk' && (deliveryState.includes('uttarakhand') || deliveryState.includes('uk'))) return true;
            
            // Check direct city matching
            return deliveryCity.includes(normC) || normC.includes(deliveryCity);
          });

          if (matched) {
            zone = zKey;
            found = true;
            break;
          }
        }
      }

      // Look up zone rate
      const zones = rateConfig.zones || {};
      let zoneRate = zones[zone];
      if (zoneRate === undefined) {
        // Fallback for Air missing zones 1 and 2
        if (isAir && (zone === '1' || zone === '2')) {
          zoneRate = zones['3']; // Fallback to zone 3 rate
        } else {
          zoneRate = zones['6'] || 0; // Default fallback
        }
      }

      const minW = rateConfig.minWeight || 3;
      const chargedWeight = Math.max(minW, weight);
      const baseCost = chargedWeight * zoneRate;

      const gstPercent = doc.gst || 0;
      const finalCost = baseCost * (1 + gstPercent / 100);
      return Math.round(finalCost * 100) / 100;
    }

    throw new Error(`Unknown courier key: ${courierKey}`);
  };
};
