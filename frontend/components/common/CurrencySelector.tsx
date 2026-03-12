import React, { useRef, useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { ChevronDown, Check } from 'lucide-react';
import { useOnClickOutside } from '../hooks/useOnClickOutside'; // Assuming this hook exists or I'll standard ref strategy

export const CurrencySelector: React.FC = () => {
  const { userCurrency, currencies, setUserCurrencyCode } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-white/5 transition text-sm text-gray-300 hover:text-white"
        title="Select Currency"
      >
        <span>{userCurrency.symbol}</span>
        <span className="font-medium">{userCurrency.code}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-brand-darker border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="py-1 max-h-64 overflow-y-auto no-scrollbar">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-700/50">
              Select Currency
            </div>
            {currencies.map((currency) => (
              <button
                key={currency.code}
                onClick={() => {
                  setUserCurrencyCode(currency.code);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors ${userCurrency.code === currency.code ? 'bg-brand-primary/10 text-brand-primary' : 'text-gray-300'
                  }`}
              >
                <div className="flex items-center">
                  <span className="w-8 font-medium">{currency.symbol}</span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{currency.code}</span>
                    <span className="text-xs text-gray-500">{currency.name}</span>
                  </div>
                </div>
                {userCurrency.code === currency.code && (
                  <Check className="w-4 h-4 text-brand-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
