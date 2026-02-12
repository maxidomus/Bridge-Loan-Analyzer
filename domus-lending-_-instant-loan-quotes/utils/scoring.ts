import { LoanRequest, UnderwritingResult, LoanType, ExperienceRange, ExperienceValueRange, LoanPurpose } from "../types";

export const calculateUnderwriting = (data: LoanRequest): UnderwritingResult => {
  const failures: string[] = [];
  const warnings: string[] = [];
  
  let totalLoanAmount = 0;
  let day1LoanAmount = 0;
  let holdback = 0;
  let interestRate = 0;
  
  let ltv = 0;
  let ltc = 0;
  let arvLtv = 0;
  let rehabClass: 'Light Rehab' | 'Heavy Rehab' | undefined;

  const cityNormalized = data.city?.toLowerCase() || "";
  const state = data.propertyState?.toUpperCase() || "";

  // 1. MSA Ineligible Areas
  const isWesternFL = (state === 'FL' && (cityNormalized.includes("port charlotte") || cityNormalized.includes("cape coral") || cityNormalized.includes("lehigh acres")));
  const isNYC5 = (state === 'NY' && (cityNormalized.includes("brooklyn") || cityNormalized.includes("queens") || cityNormalized.includes("manhattan") || cityNormalized.includes("bronx") || cityNormalized.includes("staten island") || cityNormalized.includes("new york city")));
  const isChicagoCity = (state === 'IL' && cityNormalized === "chicago");

  if (isWesternFL) failures.push("Western Florida (Port Charlotte, Cape Coral, Lehigh Acres) is currently an ineligible area.");
  if (isNYC5) failures.push("NYC 5 Boroughs are currently ineligible.");
  if (isChicagoCity) failures.push("Chicago city limits are ineligible; only Chicago suburbs are permitted.");

  // 2. Determine Tier
  const getTier = () => {
    const countRank = {
      [ExperienceRange.ZERO_TWO]: 0,
      [ExperienceRange.THREE_NINE]: 1,
      [ExperienceRange.TEN_PLUS]: 2,
    }[data.experienceRange || ExperienceRange.ZERO_TWO] ?? 0;

    const valueRank = {
      [ExperienceValueRange.ZERO_FIVE]: 0,
      [ExperienceValueRange.FIVE_TEN]: 1,
      [ExperienceValueRange.TEN_PLUS]: 2,
    }[data.experienceValueRange || ExperienceValueRange.ZERO_FIVE] ?? 0;

    const maxRank = Math.max(countRank, valueRank);
    if (maxRank === 2) return 'Institutional';
    if (maxRank === 1) return 'Experienced';
    return 'No Experience';
  };

  const borrowerTier = getTier();
  const isNoExp = borrowerTier === 'No Experience';

  // 3. FICO & Base Logic
  const fico = data.ficoScore;
  if (!data.isForeignNational) {
    if (fico < 620) failures.push("Minimum FICO requirement is 620 for US residents.");
    if (fico < 680 && isNoExp) failures.push("Borrowers with FICO under 680 must have at least 'Experienced' status.");
    if (isNoExp && fico < 660) failures.push("Minimum FICO for 'No Experience' borrowers is 660.");
  }

  if (data.mortgageLates) failures.push("Recent mortgage lates make the scenario ineligible.");

  // 4. Financial Constants
  const isBridge = data.loanType === LoanType.BRIDGE;
  const basis = (data.loanPurpose === LoanPurpose.PURCHASE) ? (data.purchasePrice || 0) : (data.asIsValue || 0);
  const rehab = isBridge ? 0 : (data.rehabBudget || data.constructionCosts || 0);
  const arv = isBridge ? basis : (data.estimatedARV || 0);
  const totalCost = basis + rehab;
  const payoff = data.payoffAmount || 0;

  // Internal Profit Margin Check (Flag as risk if < 5%)
  const expectedProfit = arv - totalCost;
  const profitMargin = totalCost > 0 ? expectedProfit / totalCost : 0;
  if (!isBridge && profitMargin < 0.05) {
    warnings.push("Low Profit Margin: Estimated project profit is below 5%. This project is flagged as High Risk due to insufficient equity/profit cushion.");
  }

  // 5. Leverage Adjustments
  let ltcReduction = 0;
  let ltaivReduction = 0;
  let ltarvReduction = 0;

  if (state === 'FL') {
    ltcReduction += 0.05; 
    ltaivReduction += 0.05; 
    ltarvReduction += 0.05;
    warnings.push("Florida Market Adjustment: 5% reduction applied.");
  }

  if (fico < 680 && !data.isForeignNational) {
    ltcReduction += 0.10; ltaivReduction += 0.10; ltarvReduction += 0.10;
    warnings.push("FICO under 680: 10% leverage reduction applied.");
    if (data.loanPurpose === LoanPurpose.REFI_CO) failures.push("Cash-out requires FICO 680+.");
  }

  // 6. Leverage Calculations
  let maxLTAIV = 0;
  let maxLTC = 0;
  let maxLTARV = 0;

  if (data.loanType === LoanType.FIX_FLIP || data.loanType === LoanType.GROUND_UP) {
    if (data.loanType === LoanType.FIX_FLIP) {
      const rehabRatio = basis > 0 ? rehab / basis : 0;
      rehabClass = (rehabRatio > 0.50 || data.sqftIncreaseOver25) ? 'Heavy Rehab' : 'Light Rehab';
      if (rehabClass === 'Light Rehab') {
        if (borrowerTier === 'Institutional') { maxLTAIV = 0.90; maxLTC = 0.95; maxLTARV = 0.75; }
        else if (borrowerTier === 'Experienced') { maxLTAIV = 0.85; maxLTC = 0.90; maxLTARV = 0.75; }
        else { maxLTAIV = 0.75; maxLTC = 0.80; maxLTARV = 0.70; }
      } else {
        if (borrowerTier === 'Institutional') { maxLTAIV = 0.85; maxLTC = 0.85; maxLTARV = 0.75; }
        else if (borrowerTier === 'Experienced') { maxLTAIV = 0.85; maxLTC = 0.85; maxLTARV = 0.70; }
        else failures.push("Heavy Rehab not available for 'No Experience' borrowers.");
      }
    } else { // GUC
      if (isNoExp) failures.push("Ground Up not available for 'No Experience' borrowers.");
      else {
        maxLTAIV = data.hasApprovedPermits ? 0.70 : 0.60;
        maxLTC = 0.85;
        maxLTARV = borrowerTier === 'Institutional' ? 0.75 : 0.70;
      }
    }
  } else { // Bridge
    if (borrowerTier === 'Institutional') maxLTAIV = data.loanPurpose === LoanPurpose.PURCHASE ? 0.85 : 0.80;
    else if (borrowerTier === 'Experienced') maxLTAIV = data.loanPurpose === LoanPurpose.PURCHASE ? 0.85 : (data.loanPurpose === LoanPurpose.REFI_RT ? 0.75 : 0.70);
    else {
      if (data.loanPurpose === LoanPurpose.REFI_CO) failures.push("Cash-out Bridge not available for 'No Experience' borrowers.");
      maxLTAIV = data.loanPurpose === LoanPurpose.PURCHASE ? 0.75 : 0.70;
    }
    maxLTC = maxLTAIV;
    maxLTARV = 0; 
  }

  if (failures.length === 0) {
    const finalLTAIV = Math.max(0, maxLTAIV - ltaivReduction);
    const finalLTC = Math.max(0, maxLTC - ltcReduction);
    const finalLTARV = Math.max(0, maxLTARV - ltarvReduction);

    const loanByCost = totalCost * finalLTC;
    const loanByARV = (finalLTARV > 0 && arv > 0) ? arv * finalLTARV : Infinity;
    totalLoanAmount = Math.min(loanByCost, loanByARV);

    let calcDay1 = basis * finalLTAIV;
    if (data.loanPurpose === LoanPurpose.REFI_RT && payoff > 0) {
      calcDay1 = Math.min(calcDay1, payoff);
    }
    day1LoanAmount = Math.min(calcDay1, totalLoanAmount);
    holdback = isBridge ? 0 : Math.max(0, totalLoanAmount - day1LoanAmount);
  }

  // 7. Loan Limits
  const minLoan = data.loanType === LoanType.GROUND_UP ? 150000 : 125000;
  if (totalLoanAmount < minLoan && failures.length === 0) failures.push(`Loan amount $${totalLoanAmount.toLocaleString()} is below $${minLoan.toLocaleString()} minimum.`);

  // 8. PRICING
  let isTier2 = false;
  const currentLtc = totalCost > 0 ? totalLoanAmount / totalCost : 0;
  if (data.isForeignNational || isNoExp || totalLoanAmount > 3000000 || currentLtc > 0.90) isTier2 = true;
  interestRate = isTier2 ? 9.875 : (totalLoanAmount > 1200000 ? 8.99 : 9.375);

  ltv = basis > 0 ? (isBridge ? totalLoanAmount / basis : day1LoanAmount / basis) : 0;
  ltc = totalCost > 0 ? totalLoanAmount / totalCost : 0;
  arvLtv = isBridge ? ltv : (arv > 0 ? totalLoanAmount / arv : 0);

  let band: 'Green' | 'Yellow' | 'Red' = 'Green';
  if (failures.length > 0) band = 'Red';
  else if (warnings.length > 0) band = 'Yellow';

  return {
    score: band === 'Red' ? 25 : (band === 'Yellow' ? 70 : 98),
    band,
    qualified: band !== 'Red',
    maxLoanAmount: totalLoanAmount,
    day1LoanAmount: isBridge ? totalLoanAmount : day1LoanAmount,
    holdback,
    interestRate,
    ltv,
    ltc: isBridge ? undefined : ltc,
    arvLtv: isBridge ? undefined : arvLtv,
    reasoning: [...failures, ...warnings].join(". "),
    analysis: { 
      narrativeSummary: `Underwriting analysis for ${borrowerTier} tier.`, 
      isPotentialRural: false,
      marketAnalysis: {
        trend: "Stable",
        comparableSales: "Analysis pending verification",
        domTrend: "45-60 days",
        arvRealism: isBridge ? "N/A (Bridge)" : "Fair"
      },
      financialSummary: {
        expectedProfit: expectedProfit,
        expectedROI: profitMargin,
        allInCostVsArv: "Calculating..."
      },
      riskAssessment: {
        budgetToAivRatio: basis > 0 ? `${((rehab / basis) * 100).toFixed(1)}%` : "N/A",
        profitMarginAssessment: profitMargin < 0.10 ? "Tight" : "Healthy",
        marketRiskFactors: [],
        timelineFeasibility: "Standard"
      },
      redFlags: [],
      improvementChecklist: [] 
    }
  };
};