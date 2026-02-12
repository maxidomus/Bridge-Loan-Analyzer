import { GoogleGenAI, Type } from "@google/genai";
import { LoanRequest, AnalysisResult, LoanType, ExperienceRange, ExperienceValueRange } from "../types";

export const analyzeDealWithAI = async (
  request: LoanRequest, 
  score: number, 
  band: string, 
  ltv: number
): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
  
  const isInst = request.experienceRange === ExperienceRange.TEN_PLUS || request.experienceValueRange === ExperienceValueRange.TEN_PLUS;
  const isExp = !isInst && (request.experienceRange === ExperienceRange.THREE_NINE || request.experienceValueRange === ExperienceValueRange.FIVE_TEN);
  const tier = isInst ? 'Institutional' : isExp ? 'Experienced' : 'No Experience';

  const basis = request.purchasePrice || request.asIsValue || 0;
  const rehab = request.rehabBudget || request.constructionCosts || 0;
  const arv = request.estimatedARV || 0;
  const totalCost = basis + rehab;

  const prompt = `
    Persona: Senior Real Estate Credit Underwriter.
    Property: ${request.zipCode} in city ${request.city}, state ${request.propertyState}.
    Asset Type: ${request.assetType}. 
    Experience Tier: ${tier}.

    DEAL NUMBERS:
    - Basis: $${basis.toLocaleString()}
    - Rehab: $${rehab.toLocaleString()}
    - ARV: $${arv.toLocaleString()}

    TASK:
    1. MARKET ANALYSIS: Search for ${request.assetType} trends in zip code ${request.zipCode}.
    2. RURAL CHECK: Determine if this zip code is considered a "Rural Area" (low density, outside major MSA).
    3. FINANCIAL SUMMARY: Calculate Expected Profit.
    4. RED FLAGS: Warn about geographic risks or unrealistic budgets.

    JSON SCHEMA:
    {
      "narrativeSummary": "High-level summary.",
      "isPotentialRural": boolean,
      "marketAnalysis": {
        "trend": "Stable",
        "comparableSales": "Analysis",
        "domTrend": "Average DOM",
        "arvRealism": "Comment"
      },
      "financialSummary": {
        "expectedProfit": 0,
        "expectedROI": 0,
        "allInCostVsArv": "N/A"
      },
      "riskAssessment": {
        "budgetToAivRatio": "XX%",
        "profitMarginAssessment": "Moderate",
        "marketRiskFactors": ["List"],
        "timelineFeasibility": "Comment"
      },
      "redFlags": ["Flag 1"],
      "improvementChecklist": ["Action 1"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            narrativeSummary: { type: Type.STRING },
            isPotentialRural: { type: Type.BOOLEAN },
            marketAnalysis: {
              type: Type.OBJECT,
              properties: {
                trend: { type: Type.STRING },
                comparableSales: { type: Type.STRING },
                domTrend: { type: Type.STRING },
                arvRealism: { type: Type.STRING }
              },
              required: ["trend", "comparableSales", "domTrend", "arvRealism"]
            },
            financialSummary: {
              type: Type.OBJECT,
              properties: {
                expectedProfit: { type: Type.NUMBER },
                expectedROI: { type: Type.NUMBER },
                allInCostVsArv: { type: Type.STRING }
              },
              required: ["expectedProfit", "expectedROI", "allInCostVsArv"]
            },
            riskAssessment: {
              type: Type.OBJECT,
              properties: {
                budgetToAivRatio: { type: Type.STRING },
                profitMarginAssessment: { type: Type.STRING },
                marketRiskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                timelineFeasibility: { type: Type.STRING }
              },
              required: ["budgetToAivRatio", "profitMarginAssessment", "marketRiskFactors", "timelineFeasibility"]
            },
            redFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementChecklist: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["narrativeSummary", "isPotentialRural", "marketAnalysis", "financialSummary", "riskAssessment", "redFlags", "improvementChecklist"]
        }
      }
    });

    const text = response.text?.trim() || "";
    const result = text ? JSON.parse(text) : getDefaultAnalysis();
    return {
      ...result,
      groundingSources: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return getDefaultAnalysis();
  }
};

const getDefaultAnalysis = (): AnalysisResult => ({
  narrativeSummary: "Underwriting verification in progress.",
  isPotentialRural: false,
  marketAnalysis: { trend: "Stable", comparableSales: "Moderate", domTrend: "45-60 days", arvRealism: "Fair" },
  financialSummary: { expectedProfit: 0, expectedROI: 0, allInCostVsArv: "Calculating..." },
  riskAssessment: { budgetToAivRatio: "N/A", profitMarginAssessment: "Moderate", marketRiskFactors: [], timelineFeasibility: "Standard" },
  redFlags: [],
  improvementChecklist: ["Verify project scope"]
});
