import React, { useState } from 'react';
import { UnderwritingResult, LoanRequest, LoanType, LoanPurpose } from '../types';

interface ResultViewProps {
  result: UnderwritingResult;
  request: LoanRequest;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ result, request, onReset }) => {
  const [leadFormSubmitted, setLeadFormSubmitted] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadData, setLeadData] = useState({ name: '', email: '', phone: '' });

  const isDeclined = result.band === 'Red';
  const isBridge = request.loanType === LoanType.BRIDGE;
  const isCashOut = request.loanPurpose === LoanPurpose.REFI_CO;
  const isPurchase = request.loanPurpose === LoanPurpose.PURCHASE;
  const isRefiRT = request.loanPurpose === LoanPurpose.REFI_RT;
  const isRural = result.analysis.isPotentialRural;

  // Constants
  const isFlorida = request.propertyState === 'FL';
  const originationPoints = isFlorida ? 1.25 : 2;
  const originationFee = result.maxLoanAmount * (originationPoints / 100);
  const closingCosts = result.maxLoanAmount * 0.01;
  const termMonths = request.loanType === LoanType.GROUND_UP ? 18 : 12;
  const underwritingFee = 1995;

  // Bridge Cash to Borrower Formula: Total loan amount - payoff - 3% of loan amount
  const bridgeCashToBorrower = result.maxLoanAmount - (request.payoffAmount || 0) - (result.maxLoanAmount * 0.03);

  // Liquidity Offset Logic - ALWAYS ROUNDED UP
  let rawCashToCloseValue = 0;
  if (isPurchase) {
    rawCashToCloseValue = (request.purchasePrice || 0) + originationFee + closingCosts - result.day1LoanAmount;
  } else if (isRefiRT) {
    rawCashToCloseValue = (request.payoffAmount || 0) + originationFee + closingCosts - result.day1LoanAmount;
  }

  // Mandatory 4 Line Breakdown (Rounded up, no decimals)
  const cashToClose = Math.ceil(Math.max(0, rawCashToCloseValue));
  const sixMonthsPayments = Math.ceil(((result.maxLoanAmount * (result.interestRate / 100)) / 12) * 6);
  const rehabContingency = isBridge ? 0 : Math.ceil(result.holdback * 0.10);
  const totalRehab = isBridge ? 0 : (request.rehabBudget || request.constructionCosts || 0);
  const unfundedBudget = isBridge ? 0 : Math.ceil(Math.max(0, totalRehab - result.holdback));

  const grossLiquidity = cashToClose + sixMonthsPayments + rehabContingency + unfundedBudget;
  
  // Official proceeds calculation for cash-out refi
  const cashOutProceeds = isCashOut 
    ? Math.ceil(isBridge 
        ? bridgeCashToBorrower 
        : (result.day1LoanAmount - (request.payoffAmount || 0) - (result.maxLoanAmount * 0.04))) 
    : 0;

  const netLiquidityRequired = Math.ceil(Math.max(0, grossLiquidity - Math.max(0, cashOutProceeds)));

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLead(true);

    const templateParams = {
      from_name: leadData.name,
      borrower_name: leadData.name,
      borrower_email: leadData.email,
      borrower_phone: leadData.phone,
      fico_score: request.ficoScore,
      asset_type: request.assetType,
      zip_code: request.zipCode,
      property_state: request.propertyState,
      loan_purpose: request.loanPurpose,
      loan_type: request.loanType,
      property_value: request.purchasePrice || request.asIsValue || 0,
      total_loan_amount: result.maxLoanAmount,
      day1_loan_amount: result.day1LoanAmount,
      holdback_amount: result.holdback,
      interest_rate: result.interestRate,
      cash_to_close: cashToClose,
      interest_reserves: sixMonthsPayments,
      rehab_contingency: rehabContingency,
      unfunded_rehab: unfundedBudget,
      net_liquidity_required: netLiquidityRequired
    };

    try {
      // @ts-ignore
      await emailjs.send(
        'service_y6p4adn',
        'template_ygxd7jl',
        templateParams
      );
      setLeadFormSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('EmailJS Error:', error);
      alert('There was an error submitting your request. Please try again.');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const SectionTitle = ({ title, icon }: { title: string, icon: string }) => (
    <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
      <span className="text-lg">{icon}</span> {title}
    </h3>
  );

  const StatBox = ({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) => (
    <div className={`p-6 rounded-2xl border transition-all ${highlight ? 'bg-indigo-900 border-indigo-900 text-white shadow-xl shadow-indigo-200' : 'bg-white border-slate-100 text-slate-900 shadow-sm'}`}>
      <span className={`text-[10px] font-black uppercase tracking-widest mb-1 block ${highlight ? 'text-indigo-300' : 'text-slate-400'}`}>{label}</span>
      <span className="text-2xl font-black block">{value}</span>
    </div>
  );

  // VIEW 2: OFFICIAL RATE & TERMS
  if (leadFormSubmitted) {
    return (
      <div className="max-w-4xl mx-auto space-y-12 animate-in py-12">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
          <h2 className="text-4xl font-black text-slate-900 leading-tight">Your Official Rate & Terms</h2>
          <p className="text-lg text-slate-500 font-medium">Scenario Zip: {request.zipCode}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-slate-900 p-6 text-white"><h4 className="font-black uppercase tracking-widest text-xs opacity-70">Loan Specification</h4></div>
            <div className="p-8 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                <span className="text-slate-500 font-bold text-sm">Total Loan Amount</span>
                <span className="text-slate-900 font-black">${result.maxLoanAmount.toLocaleString()}</span>
              </div>
              
              {isBridge ? (
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <span className="text-slate-500 font-bold text-sm">LTV %</span>
                  <span className="text-indigo-600 font-black">{(result.ltv * 100).toFixed(1)}%</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <span className="text-slate-500 font-bold text-sm">Day 1 Loan Amount</span>
                    <span className="text-slate-900 font-bold">${result.day1LoanAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <span className="text-slate-500 font-bold text-sm">Holdback</span>
                    <span className="text-slate-900 font-bold">${result.holdback.toLocaleString()}</span>
                  </div>
                </>
              )}

              {/* Cash to Close highlighted on final page */}
              {!isCashOut ? (
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-indigo-600 font-black text-sm uppercase tracking-wider">Estimated Cash to Close</span>
                  <span className="text-indigo-600 font-black text-xl">${cashToClose.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-emerald-600 font-black text-sm uppercase tracking-wider">Estimated Cash to Borrower</span>
                  <span className="text-emerald-600 font-black text-xl">${cashOutProceeds.toLocaleString()}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4">
                <span className="text-slate-500 font-bold text-sm">Interest Rate</span>
                <span className="text-slate-900 font-black text-xl">{result.interestRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-3xl shadow-xl p-8 text-white flex flex-col justify-center space-y-6">
             <div className="space-y-1">
               <span className="text-indigo-200 font-black uppercase tracking-widest text-[10px]">Origination ({originationPoints}%)</span>
               <div className="text-3xl font-black">${originationFee.toLocaleString()}</div>
             </div>
             <div className="space-y-1">
               <span className="text-indigo-200 font-black uppercase tracking-widest text-[10px]">Underwriting Fee</span>
               <div className="text-3xl font-black">${underwritingFee.toLocaleString()}</div>
             </div>
             <div className="pt-4 border-t border-white/20">
               <span className="text-indigo-200 font-black uppercase tracking-widest text-[10px]">Term</span>
               <div className="text-xl font-bold">{termMonths} Months</div>
             </div>
          </div>
        </div>

        <div className="bg-slate-100 p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6 text-center">
          <p className="text-slate-600 font-bold text-lg leading-relaxed italic max-w-2xl mx-auto">
            "This is a soft quote, not a commitment to lend. All terms are subject to underwriting and verifying the information provided."
          </p>
          <div className="h-px bg-slate-200 w-24 mx-auto" />
          <p className="text-indigo-600 font-black text-xl">
            A member of the Domus Lending team will reach out to you in one business day.
          </p>
        </div>

        <div className="text-center"><button onClick={onReset} className="text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-indigo-600">Analyze Another Deal</button></div>
      </div>
    );
  }

  // VIEW 1: INITIAL ANALYSIS
  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24 animate-in duration-700">
      <div className={`p-10 rounded-3xl border-2 flex flex-col md:flex-row justify-between items-center gap-8 ${isDeclined ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
        <div className="text-center md:text-left space-y-2">
          <h2 className={`text-5xl font-black ${isDeclined ? 'text-rose-900' : 'text-emerald-900'}`}>{isDeclined ? 'Scenario Flagged' : 'Deal Analysis Ready'}</h2>
          <p className={`text-lg font-medium ${isDeclined ? 'text-rose-600' : 'text-emerald-600'}`}>
            {isDeclined ? 'This scenario does not meet current guidelines.' : 'Preliminary Analysis Complete'}
          </p>
        </div>
      </div>

      {isRural && (
        <div className="bg-amber-50 border-4 border-amber-400 p-10 rounded-3xl space-y-4 shadow-xl">
          <h3 className="text-amber-900 font-black text-2xl uppercase tracking-tighter flex items-center gap-3">
            ⚠️ POTENTIAL RURAL PROPERTY WARNING
          </h3>
          <p className="text-amber-800 font-bold text-lg leading-relaxed">
            Our analysis indicates this property may be located in a <span className="underline decoration-amber-500 decoration-4">Rural Area</span>. 
            Domus Lending does not fund loans in rural locations. 
          </p>
          <p className="text-amber-700 font-medium">
            While we have provided terms below for your scenario analysis, please note that if the property is verified as rural during formal underwriting, we will be unable to proceed with the loan.
          </p>
        </div>
      )}

      {isDeclined && (
        <div className="bg-rose-100 p-8 rounded-3xl border-2 border-rose-200 space-y-4">
          <SectionTitle title="Eligibility Breakdown" icon="🚩" />
          <p className="text-rose-800 font-bold text-lg leading-relaxed">{result.reasoning}</p>
        </div>
      )}

      {/* Internal Risk Warning for low profit */}
      {!isDeclined && result.band === 'Yellow' && result.reasoning.includes("Low Profit Margin") && (
        <div className="bg-rose-50 border-l-8 border-rose-500 p-8 rounded-3xl shadow-sm">
          <h4 className="text-rose-900 font-black text-lg mb-2 flex items-center gap-2">⚠️ HIGH RISK MARGIN ALERT</h4>
          <p className="text-rose-800 font-bold">{result.reasoning.split('. ').find(r => r.includes("Profit Margin"))}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-12">
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl space-y-8">
            <SectionTitle title="Initial Deal Feedback" icon="📊" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatBox label="Total Loan Amount" value={`$${result.maxLoanAmount.toLocaleString()}`} highlight />
              {!isCashOut ? (
                <StatBox label="Est. Cash to Close" value={`$${cashToClose.toLocaleString()}`} highlight />
              ) : (
                <StatBox label="Est. Cash to Borrower" value={`$${cashOutProceeds.toLocaleString()}`} highlight />
              )}
            </div>
            {!isBridge && <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><StatBox label="Day 1 Loan" value={`$${result.day1LoanAmount.toLocaleString()}`} /><StatBox label="Holdback" value={`$${result.holdback.toLocaleString()}`} /></div>}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div className="space-y-1"><label className="text-[10px] font-black text-indigo-400 uppercase">LTV %</label><p className="text-xl font-bold">{(result.ltv * 100).toFixed(1)}%</p></div>
              {!isBridge ? (
                <>
                  <div className="space-y-1"><label className="text-[10px] font-black text-indigo-400 uppercase">LTC %</label><p className="text-xl font-bold">{(result.ltc! * 100).toFixed(1)}%</p></div>
                  <div className="space-y-1"><label className="text-[10px] font-black text-indigo-400 uppercase">LTARV %</label><p className="text-xl font-bold">{(result.arvLtv! * 100).toFixed(1)}%</p></div>
                </>
              ) : (
                <div className="space-y-1 col-span-2"><label className="text-[10px] font-black text-indigo-400 uppercase">Cash to Borrower</label><p className="text-xl font-bold">${bridgeCashToBorrower.toLocaleString()}</p></div>
              )}
            </div>
          </div>

          {!isDeclined && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
              <SectionTitle title="Liquidity & Reserves Requirement" icon="💰" />
              <div className="flex flex-col md:flex-row gap-8 items-center border-b border-slate-50 pb-8">
                <div className="text-center md:text-left flex-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Net Liquidity Needed</span>
                  <div className="text-4xl font-black text-indigo-600">${netLiquidityRequired.toLocaleString()}</div>
                  {isCashOut && <p className="text-xs text-indigo-500 font-bold mt-2">Requirement reduced by ${cashOutProceeds.toLocaleString()} in proceeds.</p>}
                </div>
              </div>
              
              {/* Refined 4-Line Breakdown */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-slate-500 font-bold text-sm">Cash to Close</span>
                  <span className="text-slate-900 font-black">${cashToClose.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-slate-500 font-bold text-sm">6 Months of Interest Payments</span>
                  <span className="text-slate-900 font-black">${sixMonthsPayments.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-50">
                  <span className="text-slate-500 font-bold text-sm">10% of Rehab Financed</span>
                  <span className="text-slate-900 font-black">${rehabContingency.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-slate-500 font-bold text-sm">Rehab Budget Not Financed</span>
                  <span className="text-slate-900 font-black">${unfundedBudget.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <SectionTitle title="Market Analysis" icon="🌎" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Trend</label><p className="font-bold">{result.analysis.marketAnalysis.trend}</p></div>
              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase">Avg. DOM</label><p className="font-bold">{result.analysis.marketAnalysis.domTrend}</p></div>
              <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase">Comparable Sales</label><p className="text-slate-600 text-sm font-medium">{result.analysis.marketAnalysis.comparableSales}</p></div>
              {!isBridge && <div className="md:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase">ARV Realism</label><p className="text-slate-600 text-sm font-medium">{result.analysis.marketAnalysis.arvRealism}</p></div>}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {!isDeclined && (
            <div className="bg-indigo-600 p-8 rounded-3xl shadow-2xl text-white space-y-6 sticky top-24">
              <h3 className="text-2xl font-black">Get Official Quote</h3>
              <p className="text-sm opacity-80 font-medium">Locked rate and detailed disclosure pending contact.</p>
              <form onSubmit={handleLeadSubmit} className="space-y-4">
                <input required className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none" placeholder="Name" value={leadData.name} onChange={e=>setLeadData({...leadData,name:e.target.value})}/>
                <input required type="email" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none" placeholder="Email" value={leadData.email} onChange={e=>setLeadData({...leadData,email:e.target.value})}/>
                <input required type="tel" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none" placeholder="Phone" value={leadData.phone} onChange={e=>setLeadData({...leadData,phone:e.target.value})}/>
                <button disabled={isSubmittingLead} className="w-full bg-white text-indigo-600 font-black py-4 rounded-xl shadow-xl hover:bg-slate-50 transition-all">{isSubmittingLead ? "Processing..." : "Get Terms"}</button>
              </form>
            </div>
          )}
          {isDeclined && <button onClick={onReset} className="w-full bg-slate-900 text-white font-black py-4 rounded-3xl hover:bg-slate-800 transition">Analyze Another</button>}
        </div>
      </div>
    </div>
  );
};

export default ResultView;