export enum AssetType {
  SINGLE = 'Single Family',
  TWO_UNIT = 'Duplex',
  THREE_UNIT = '3 units',
  FOUR_UNIT = 'Fourplex',
}

export enum LoanType {
  FIX_FLIP = 'Fix and Flip',
  GROUND_UP = 'Ground up construction',
  BRIDGE = 'Bridge (no rehab)',
}

export enum LoanPurpose {
  PURCHASE = 'Purchase',
  REFI_RT = 'Rate and term refinance',
  REFI_CO = 'Cash-out refinance',
}

export enum ExperienceRange {
  ZERO_TWO = '0-2',
  THREE_NINE = '3-9',
  TEN_PLUS = 'Over 10',
}

export enum ExperienceValueRange {
  ZERO_FIVE = '$0-$5M',
  FIVE_TEN = '$5M to $10M',
  TEN_PLUS = 'Over $10M',
}

export enum BridgeExitStrategy {
  RENT = 'Rent',
  SELL = 'Sell',
}

export interface AnalysisResult {
  narrativeSummary: string;
  isPotentialRural: boolean;
  marketAnalysis: {
    trend: string;
    comparableSales: string;
    domTrend: string;
    arvRealism: string;
  };
  financialSummary: {
    expectedProfit: number;
    expectedROI: number;
    allInCostVsArv: string;
  };
  riskAssessment: {
    budgetToAivRatio: string;
    profitMarginAssessment: string;
    marketRiskFactors: string[];
    timelineFeasibility: string;
  };
  redFlags: string[];
  improvementChecklist: string[];
  groundingSources?: any[];
}

export interface LoanRequest {
  loanType: LoanType;
  loanPurpose: LoanPurpose;
  
  // Profile
  ficoScore: number;
  isForeignNational: boolean;
  experienceRange?: ExperienceRange;
  experienceValueRange?: ExperienceValueRange;
  
  // Property Info
  city: string;
  zipCode: string;
  propertyState: string;
  assetType: AssetType;
  propertySqft?: number;
  sqftIncreaseOver25?: boolean;
  hasApprovedPermits?: boolean;
  isShortTermRental?: boolean;
  exitStrategy?: BridgeExitStrategy;
  
  // Financials
  purchasePrice?: number;
  asIsValue?: number;
  payoffAmount?: number;
  rehabBudget?: number;
  constructionCosts?: number;
  landValue?: number;
  estimatedARV?: number;
  
  // Refi specific
  mortgageLates?: boolean;

  // Bridge specific
  monthlyRent?: number;
  monthlyTax?: number;
  monthlyHoa?: number;
  monthlyInsurance?: number;
  
  liquidity: number;
  experienceCount: number; // For backward compatibility
}

export interface UnderwritingResult {
  score: number;
  band: 'Green' | 'Yellow' | 'Red';
  qualified: boolean;
  maxLoanAmount: number;
  day1LoanAmount: number;
  holdback: number;
  interestRate: number;
  ltv: number;
  ltc?: number;
  arvLtv?: number;
  dscr?: number;
  rehabClass?: 'Light Rehab' | 'Heavy Rehab';
  reasoning: string;
  analysis: AnalysisResult;
}