import React, { useState, useEffect } from 'react';
import { 
  LoanRequest, 
  LoanType, 
  LoanPurpose, 
  AssetType, 
  ExperienceRange, 
  ExperienceValueRange,
  BridgeExitStrategy
} from '../types';
import { getStateFromZip } from '../utils/zipUtils';

interface DealFormProps {
  onSubmit: (data: LoanRequest) => void;
  isLoading: boolean;
}

const formatNumber = (val: number | string) => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US');
};

const parseNumber = (val: string) => {
  return parseFloat(val.replace(/,/g, '')) || 0;
};

// Sub-components moved outside to fix the focus bug
const OptionCard = ({ title, active, onClick, icon, description }: { title: string, active: boolean, onClick: () => void, icon?: string, description?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-3 group h-full ${
      active 
        ? 'border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50' 
        : 'border-slate-200 bg-white hover:border-indigo-300'
    }`}
  >
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'}`}>
      {icon || '✓'}
    </div>
    <div>
      <h4 className={`font-bold text-lg ${active ? 'text-indigo-900' : 'text-slate-700'}`}>{title}</h4>
      {description && <p className="text-xs text-slate-400 font-medium mt-1 leading-relaxed">{description}</p>}
    </div>
  </button>
);

const ChipSelector = ({ label, options, current, onSelect }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map((opt: any) => (
        <button
          key={opt}
          type="button"
          onClick={() => onSelect(opt)}
          className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
            current === opt 
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const InputField = ({ label, name, placeholder, suffix, helperText, value, onChange, noFormat }: any) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      {suffix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>}
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        value={noFormat ? value : formatNumber(value)}
        onChange={(e) => {
          const rawValue = e.target.value.replace(/[^0-9.]/g, '');
          onChange({ target: { name, value: rawValue } } as any);
        }}
        className={`w-full ${suffix ? 'pl-8' : 'pl-4'} pr-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800`}
      />
    </div>
    {helperText && <p className="text-[10px] text-slate-400 font-medium">{helperText}</p>}
  </div>
);

const ToggleSwitch = ({ label, description, checked, onChange, colorClass = "text-indigo-600" }: any) => (
  <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all">
    <input 
      type="checkbox" 
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className={`w-5 h-5 rounded ${colorClass} focus:ring-indigo-500`}
    />
    <div className="flex flex-col">
      <span className="text-xs font-bold text-slate-700 uppercase tracking-widest leading-none">{label}</span>
      {description && <span className="text-[10px] text-slate-400 font-medium">{description}</span>}
    </div>
  </label>
);

const DealForm: React.FC<DealFormProps> = ({ onSubmit, isLoading }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<LoanRequest>>({
    loanType: undefined,
    loanPurpose: undefined,
    propertyState: 'TX',
    city: '',
    zipCode: '',
    assetType: AssetType.SINGLE,
    ficoScore: 720,
    experienceRange: ExperienceRange.THREE_NINE,
    experienceValueRange: ExperienceValueRange.ZERO_FIVE,
    isForeignNational: false,
    sqftIncreaseOver25: false,
    hasApprovedPermits: false,
    mortgageLates: false,
    exitStrategy: BridgeExitStrategy.RENT,
    liquidity: 0
  });

  const updateForm = (updates: Partial<LoanRequest>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (formData.zipCode && formData.zipCode.length >= 3) {
      const state = getStateFromZip(formData.zipCode);
      if (state && state !== formData.propertyState) {
        updateForm({ propertyState: state });
      }
    }
  }, [formData.zipCode]);

  const handleNextStep = () => setStep(s => s + 1);
  const handleBackStep = () => setStep(s => s - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as LoanRequest);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateForm({ [name]: parseNumber(value) });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-2 mb-12">
        {[1, 2, 3].map(i => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= i ? 'bg-indigo-600' : 'bg-slate-200'}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900">What type of loan do you need?</h2>
              <p className="text-slate-500 font-medium">Select the option that best fits your current project.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OptionCard 
                title="Fix and Flip" 
                icon="🛠️"
                description="Purchase and rehab for quick resale."
                active={formData.loanType === LoanType.FIX_FLIP} 
                onClick={() => { updateForm({ loanType: LoanType.FIX_FLIP }); handleNextStep(); }} 
              />
              <OptionCard 
                title="Ground Up" 
                icon="🏗️"
                description="New residential construction from scratch."
                active={formData.loanType === LoanType.GROUND_UP} 
                onClick={() => { updateForm({ loanType: LoanType.GROUND_UP }); handleNextStep(); }} 
              />
              <OptionCard 
                title="Bridge" 
                icon="🌉"
                description="Short-term financing with no rehab component."
                active={formData.loanType === LoanType.BRIDGE} 
                onClick={() => { updateForm({ loanType: LoanType.BRIDGE }); handleNextStep(); }} 
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-slate-900">Transaction Type?</h2>
              <p className="text-slate-500 font-medium">Tell us if this is a new purchase or a refinance.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <OptionCard 
                title="Purchase" 
                icon="🔑"
                active={formData.loanPurpose === LoanPurpose.PURCHASE} 
                onClick={() => { updateForm({ loanPurpose: LoanPurpose.PURCHASE }); handleNextStep(); }} 
              />
              <OptionCard 
                title="Rate & Term Refi" 
                icon="📉"
                active={formData.loanPurpose === LoanPurpose.REFI_RT} 
                onClick={() => { updateForm({ loanPurpose: LoanPurpose.REFI_RT }); handleNextStep(); }} 
              />
              <OptionCard 
                title="Cash-out Refi" 
                icon="💰"
                description="FICO < 680 ineligible for cash-out."
                active={formData.loanPurpose === LoanPurpose.REFI_CO} 
                onClick={() => { updateForm({ loanPurpose: LoanPurpose.REFI_CO }); handleNextStep(); }} 
              />
            </div>
            <button type="button" onClick={handleBackStep} className="text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-indigo-600">← Back</button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 space-y-10">
            <div className="flex justify-between items-center border-b border-slate-50 pb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Project Specifics</h3>
                <p className="text-slate-500 text-sm font-medium">{formData.loanType} • {formData.loanPurpose}</p>
              </div>
              <button type="button" onClick={() => setStep(1)} className="text-xs font-bold text-indigo-600 hover:underline">Change Type</button>
            </div>

            {/* Profile Section */}
            <div className="space-y-6">
              <h4 className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-4 h-[1px] bg-indigo-200" /> Borrower Profile
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <InputField 
                    label="Credit Score" 
                    name="ficoScore" 
                    placeholder="e.g. 720"
                    value={formData.ficoScore}
                    onChange={onInputChange}
                    noFormat
                    helperText="FICO < 680 requires experienced status and results in leverage reductions."
                  />
                  <ToggleSwitch 
                    label="Foreign National"
                    description="No US Credit Score"
                    checked={formData.isForeignNational}
                    onChange={(val: boolean) => updateForm({ isForeignNational: val })}
                  />
                </div>
                <div className="space-y-6">
                  <ChipSelector 
                    label="Completed Projects (Last 3 Years)"
                    options={Object.values(ExperienceRange)}
                    current={formData.experienceRange}
                    onSelect={(val: any) => updateForm({ experienceRange: val })}
                  />
                  <ChipSelector 
                    label="Project Dollar Volume (Last 3 Years)"
                    options={Object.values(ExperienceValueRange)}
                    current={formData.experienceValueRange}
                    onSelect={(val: any) => updateForm({ experienceValueRange: val })}
                  />
                </div>
              </div>
            </div>

            {/* Property Section */}
            <div className="space-y-6">
              <h4 className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-4 h-[1px] bg-indigo-200" /> Property Data
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-4">
                  <InputField 
                    label="Property Zip Code" 
                    name="zipCode" 
                    placeholder="75201" 
                    value={formData.zipCode}
                    noFormat
                    onChange={(e: any) => updateForm({ zipCode: e.target.value })}
                    helperText={formData.propertyState ? `State detected: ${formData.propertyState}` : 'Enter Zip to detect state'}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Property Type</label>
                  <select 
                    value={formData.assetType}
                    onChange={(e) => updateForm({ assetType: e.target.value as AssetType })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-medium bg-white"
                  >
                    {Object.values(AssetType).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                
                <div className="flex flex-col justify-center">
                  {formData.loanType === LoanType.FIX_FLIP ? (
                    <ToggleSwitch 
                      label="Expansion"
                      description="Adding >25% square footage?"
                      checked={formData.sqftIncreaseOver25}
                      onChange={(val: boolean) => updateForm({ sqftIncreaseOver25: val })}
                    />
                  ) : formData.loanType === LoanType.GROUND_UP ? (
                    <ToggleSwitch 
                      label="Permits"
                      description="Do you have approved permits?"
                      checked={formData.hasApprovedPermits}
                      onChange={(val: boolean) => updateForm({ hasApprovedPermits: val })}
                    />
                  ) : (
                    <ChipSelector 
                      label="Exit Strategy"
                      options={Object.values(BridgeExitStrategy)}
                      current={formData.exitStrategy}
                      onSelect={(val: any) => updateForm({ exitStrategy: val })}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Financials Section */}
            <div className="space-y-6">
              <h4 className="text-indigo-600 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                <span className="w-4 h-[1px] bg-indigo-200" /> Capital Requirements
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {formData.loanPurpose === LoanPurpose.PURCHASE ? (
                  <InputField 
                    label={formData.loanType === LoanType.GROUND_UP ? "Land Purchase Price" : "Purchase Price"} 
                    name="purchasePrice" 
                    suffix 
                    value={formData.purchasePrice}
                    onChange={onInputChange}
                  />
                ) : (
                  <>
                    <InputField 
                      label="Estimated As-Is Value" 
                      name="asIsValue" 
                      suffix 
                      value={formData.asIsValue}
                      onChange={onInputChange}
                    />
                    <InputField 
                      label="Current Payoff" 
                      name="payoffAmount" 
                      suffix 
                      value={formData.payoffAmount}
                      onChange={onInputChange}
                    />
                  </>
                )}
                
                {formData.loanType === LoanType.GROUND_UP ? (
                  <InputField 
                    label="Construction Budget" 
                    name="constructionCosts" 
                    suffix 
                    value={formData.constructionCosts}
                    onChange={onInputChange}
                  />
                ) : formData.loanType === LoanType.FIX_FLIP ? (
                  <InputField 
                    label="Rehab Budget" 
                    name="rehabBudget" 
                    suffix 
                    value={formData.rehabBudget}
                    onChange={onInputChange}
                  />
                ) : null}

                {formData.loanType !== LoanType.BRIDGE && (
                  <InputField 
                    label="After Renovation Value (ARV)" 
                    name="estimatedARV" 
                    suffix 
                    value={formData.estimatedARV}
                    onChange={onInputChange}
                  />
                )}
                
                {formData.loanPurpose !== LoanPurpose.PURCHASE && (
                  <div className="md:col-span-2">
                    <ToggleSwitch 
                      label="Mortgage History"
                      description="Late payments on current mortgage (Yes/No)?"
                      checked={formData.mortgageLates}
                      onChange={(val: boolean) => updateForm({ mortgageLates: val })}
                      colorClass="text-rose-600"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-8 space-y-4">
              <button 
                disabled={isLoading}
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 text-lg"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Analyze my deal"
                )}
              </button>
              <button type="button" onClick={handleBackStep} className="w-full text-slate-400 font-bold text-sm uppercase tracking-widest hover:text-slate-600">Go Back</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default DealForm;