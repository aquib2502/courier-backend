/**
 * USA Remote ZIP Code Validation Rules
 * Block normal USA booking for pincodes starting with specific 3-digit prefixes
 * and prompt user to select USA Remote instead.
 */

export const USA_REMOTE_ZIP_PREFIXES = [
  "006", "007", "008", "009", "055",
  "090", "091", "092", "093", "094", "095", "096", "097", "098", "099",
  "962", "963", "964", "965", "966",
  "967", "968", "969",
  "974", "975", "976",
  "988", "989", "995",
  "996", "997", "998", "999"
];

export const USA_REMOTE_ERROR_MESSAGE = "please choose USA Remote to book for this pincodes";

export const isUSANormalCountry = (country) => {
  if (!country) return false;
  const c = country.trim().toLowerCase();
  return (
    c === "united states" ||
    c === "usa" ||
    c === "us" ||
    c === "united states (usa)"
  );
};

export const isUSARemoteZip = (pincode) => {
  if (!pincode) return false;
  const clean = String(pincode).trim().replace(/[^a-zA-Z0-9]/g, "");
  if (!clean) return false;
  const padded = /^\d+$/.test(clean) && clean.length < 5 ? clean.padStart(5, "0") : clean;
  return USA_REMOTE_ZIP_PREFIXES.some(
    (prefix) => padded.startsWith(prefix) || clean.startsWith(prefix)
  );
};

export const validateUSAZipCode = (country, pincode) => {
  if (isUSANormalCountry(country) && isUSARemoteZip(pincode)) {
    throw new Error(USA_REMOTE_ERROR_MESSAGE);
  }
};
