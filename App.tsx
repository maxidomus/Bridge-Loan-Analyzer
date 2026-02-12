import React, { useState, useEffect } from 'react';
import { LoanRequest, UnderwritingResult } from './types';
import { calculateUnderwriting } from './utils/scoring';
import { analyzeDealWithAI } from './services/geminiService';
import DealForm from './components/DealForm';
import ResultView from './components/ResultView';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UnderwritingResult | null>(null);
  const [request, setRequest] = useState<LoanRequest | null>(null);
  const [isEmbed, setIsEmbed] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('embed') === 'true') {
      setIsEmbed(true);
    }
  }, []);

  const handleDealSubmit = async (data: LoanRequest) => {
    setLoading(true);
    setRequest(data);
    
    // Quantitative score first
    const quantitative = calculateUnderwriting(data);
    
    try {
      // Enrich with AI Analysis
      // Fix: Corrected analyzeDealWithAI call to provide only the 4 expected arguments
      const analysis = await analyzeDealWithAI(
        data, 
        quantitative.score, 
        quantitative.band, 
        quantitative.ltv
      );

      setResult({ 
        ...quantitative, 
        analysis 
      });
    } catch (err) {
      console.error(err);
      setResult(quantitative);
    } finally {
      setLoading(false);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setResult(null);
    setRequest(null);
    setFormKey(prev => prev + 1);
  };

  return (
    <div className={`min-h-screen ${isEmbed ? 'bg-transparent' : 'bg-slate-50'} flex flex-col font-sans`}>
      {!isEmbed && (
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center gap-4 cursor-pointer" onClick={resetForm}>
              <div className="flex flex-col">
                <span className="text-xl font-black text-indigo-900 tracking-tighter leading-none">DOMUS</span>
                <span className="text-[9px] font-black text-indigo-500 tracking-[0.3em] leading-none mt-1 uppercase">Lending</span>
              </div>
            </div>
            <button onClick={resetForm} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
              Reset Session
            </button>
          </div>
        </header>
      )}

      <main className={`flex-grow ${isEmbed ? 'p-0' : 'max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 md:py-20'}`}>
        {!result ? (
          <div className="space-y-16">
            {!isEmbed && (
              <div className="text-center space-y-6 max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
                  Get an <span className="text-indigo-600">Actual quote</span> on your loan scenario with rate and terms instantly.
                </h1>
                <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
                  Submit your project details and receive a full credit read on leverage, rate viability, and project health in seconds.
                </p>
              </div>
            )}
            <DealForm key={formKey} onSubmit={handleDealSubmit} isLoading={loading} />
          </div>
        ) : (
          <ResultView result={result} request={request!} onReset={resetForm} />
        )}
      </main>

      {!isEmbed && (
        <footer className="py-12 border-t border-slate-100 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              Domus Lending Group © 2025 • Proprietary Underwriting Engine
            </p>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;