
export const UNDERWRITING_RULES = {
  MAX_LTV: 0.80, // 80% of purchase
  MAX_LTC: 0.90, // 90% of total cost
  MAX_ARV_RATIO: 0.70, // 70% of ARV
  MIN_CREDIT_SCORE: 620,
};

export const CHECKLIST_ITEMS = {
  GENERAL: [
    "Fully Executed Purchase Contract",
    "Preliminary Title Report",
    "Government Issued Photo ID",
    "3 Months Personal/Business Bank Statements",
    "Company Articles of Organization (if applicable)"
  ],
  REHAB: [
    "Detailed Line-Item Rehab Budget",
    "Contractor Profile & W9",
    "Builder's Risk Insurance Quote"
  ],
  RENTAL: [
    "Current Lease Agreement (if occupied)",
    "Rent Roll",
    "Property Management Agreement"
  ]
};
