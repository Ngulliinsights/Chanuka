import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, Search, ArrowLeft, ShieldAlert, Info, History } from 'lucide-react';

// Types
interface Commodity {
  id: string;
  name: string;
  category: string;
  icon: string;
  baselinePrice: number;
  acceptableRange: number; // percentage
  unit: string;
}

interface Vendor {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  reportedPrice: number;
  lastUpdated: Date;
}

interface PriceVerdict {
  status: 'NORMAL' | 'SUSPICIOUS' | 'CRITICAL';
  message: string;
  officialPrice: number;
  yourPrice: number;
  corruptionPremium: number;
  acceptableRange: string;
  percentageOverage: number;
}

// Mock Data
const COMMODITIES: Commodity[] = [
  { id: '1', name: 'Cement (50kg)', category: 'Construction', icon: '🏗️', baselinePrice: 650, acceptableRange: 15, unit: 'bag' },
  { id: '2', name: 'Maize Flour (2kg)', category: 'Food', icon: '🌽', baselinePrice: 180, acceptableRange: 20, unit: 'packet' },
  { id: '3', name: 'Business Permit', category: 'Government', icon: '📜', baselinePrice: 15000, acceptableRange: 5, unit: 'permit' },
  { id: '4', name: 'Road Bitumen', category: 'Construction', icon: '🛣️', baselinePrice: 85000, acceptableRange: 10, unit: 'per km' },
  { id: '5', name: 'Sugar (2kg)', category: 'Food', icon: '🍬', baselinePrice: 220, acceptableRange: 18, unit: 'packet' },
  { id: '6', name: 'Steel Bars (12mm)', category: 'Construction', icon: '🔧', baselinePrice: 850, acceptableRange: 12, unit: 'piece' },
];

const SokoHaki = () => {
  const [view, setView] = useState<'catalog' | 'verify' | 'result'>('catalog');
  const [selectedCommodity, setSelectedCommodity] = useState<Commodity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [enteredPrice, setEnteredPrice] = useState('');
  const [verdict, setVerdict] = useState<PriceVerdict | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const filteredCommodities = COMMODITIES.filter(
    c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(COMMODITIES.map(c => c.category)));

  const handleSelectCommodity = (commodity: Commodity) => {
    setSelectedCommodity(commodity);
    setView('verify');
    setEnteredPrice('');
  };

  const calculateVerdict = (commodity: Commodity, price: number): PriceVerdict => {
    const maxAcceptable = commodity.baselinePrice * (1 + commodity.acceptableRange / 100);
    const overage = price - commodity.baselinePrice;
    const percentageOverage = ((price - commodity.baselinePrice) / commodity.baselinePrice) * 100;

    let status: 'NORMAL' | 'SUSPICIOUS' | 'CRITICAL';
    let message: string;

    if (price <= maxAcceptable) {
      status = 'NORMAL';
      message = 'This price is within fair market range, including reasonable profit margins.';
    } else if (percentageOverage <= commodity.acceptableRange * 2) {
      status = 'SUSPICIOUS';
      message = 'This price is higher than normal. Consider negotiating or finding another vendor.';
    } else {
      status = 'CRITICAL';
      message = 'ALERT: This price far exceeds normal rates. This may indicate exploitation or corruption.';
    }

    return {
      status,
      message,
      officialPrice: commodity.baselinePrice,
      yourPrice: price,
      corruptionPremium: Math.max(0, price - maxAcceptable),
      acceptableRange: `${commodity.acceptableRange}%`,
      percentageOverage,
    };
  };

  const handleVerifyPrice = () => {
    if (!selectedCommodity || !enteredPrice) return;

    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const price = parseFloat(enteredPrice);
      const result = calculateVerdict(selectedCommodity, price);
      setVerdict(result);
      setView('result');
      setLoading(false);
    }, 800);
  };

  const handleReset = () => {
    setView('catalog');
    setSelectedCommodity(null);
    setEnteredPrice('');
    setVerdict(null);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SokoHaki</h1>
              <p className="text-sm text-gray-600 mt-1">Swahili: Market Rights • Fair Price Oracle</p>
            </div>
            <div className="flex gap-2">
              <div className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-bold">
                Nairobi
              </div>
              <div className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-bold">
                Live
              </div>
            </div>
          </div>
        </div>

        {/* CATALOG VIEW */}
        {view === 'catalog' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search commodities or categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                />
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg p-6">
              <div className="flex items-start gap-4">
                <Info className="h-6 w-6 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-2">How SokoHaki Works</h3>
                  <p className="text-sm text-blue-100">
                    Select any commodity, enter the price you're being charged, and instantly see if it's fair.
                    We compare against official baselines and market data to detect overpricing and corruption.
                  </p>
                </div>
              </div>
            </div>

            {/* Categories */}
            {categories.map(category => {
              const items = filteredCommodities.filter(c => c.category === category);
              if (items.length === 0) return null;

              return (
                <div key={category} className="bg-white rounded-xl shadow-md p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(commodity => (
                      <button
                        key={commodity.id}
                        onClick={() => handleSelectCommodity(commodity)}
                        className="bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 text-left transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{commodity.icon}</span>
                            <div>
                              <h3 className="font-semibold text-gray-800 group-hover:text-blue-600">
                                {commodity.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                Baseline: KES {commodity.baselinePrice.toLocaleString()} / {commodity.unit}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold">
                            ±{commodity.acceptableRange}%
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredCommodities.length === 0 && (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <p className="text-gray-500">No commodities found matching "{searchTerm}"</p>
              </div>
            )}
          </div>
        )}

        {/* VERIFY VIEW */}
        {view === 'verify' && selectedCommodity && (
          <div className="space-y-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Catalog
            </button>

            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <span className="text-6xl mb-4 block">{selectedCommodity.icon}</span>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {selectedCommodity.name}
                </h2>
                <p className="text-gray-600">Enter the price you're being quoted</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">Official Baseline:</span>
                  <span className="font-bold text-blue-700">
                    KES {selectedCommodity.baselinePrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-700">Fair Range:</span>
                  <span className="font-bold text-green-700">
                    KES {selectedCommodity.baselinePrice.toLocaleString()} - {Math.round(selectedCommodity.baselinePrice * (1 + selectedCommodity.acceptableRange / 100)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quoted Price
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-500 font-bold">KES</span>
                  <input
                    type="number"
                    value={enteredPrice}
                    onChange={(e) => setEnteredPrice(e.target.value)}
                    className="w-full pl-16 pr-4 py-4 text-2xl font-bold border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              <button
                onClick={handleVerifyPrice}
                disabled={!enteredPrice || loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Analyzing...
                  </span>
                ) : (
                  'Verify Fair Price'
                )}
              </button>
            </div>
          </div>
        )}

        {/* RESULT VIEW */}
        {view === 'result' && verdict && selectedCommodity && (
          <div className="space-y-4">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Check Another Item
            </button>

            {/* Verdict Card */}
            <div className={`rounded-xl shadow-2xl overflow-hidden border-t-8 ${
              verdict.status === 'NORMAL' ? 'bg-white border-green-500' :
              verdict.status === 'SUSPICIOUS' ? 'bg-white border-yellow-500' :
              'bg-red-50 border-red-600'
            }`}>
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className={`text-2xl font-bold mb-2 ${
                      verdict.status === 'CRITICAL' ? 'text-red-800' : 'text-gray-800'
                    }`}>
                      {verdict.status === 'NORMAL' && '✅ Fair Price'}
                      {verdict.status === 'SUSPICIOUS' && '⚠️ Overpriced'}
                      {verdict.status === 'CRITICAL' && '🚨 Exploitation Detected'}
                    </h3>
                    <p className="text-gray-700">{verdict.message}</p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {verdict.status === 'CRITICAL' && <ShieldAlert className="h-12 w-12 text-red-600" />}
                    {verdict.status === 'SUSPICIOUS' && <AlertTriangle className="h-12 w-12 text-yellow-600" />}
                    {verdict.status === 'NORMAL' && <CheckCircle className="h-12 w-12 text-green-500" />}
                  </div>
                </div>

                {/* Price Comparison */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
                        Official Baseline
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        KES {verdict.officialPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
                        You're Paying
                      </div>
                      <div className={`text-3xl font-bold ${
                        verdict.status === 'CRITICAL' ? 'text-red-600' :
                        verdict.status === 'SUSPICIOUS' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        KES {verdict.yourPrice.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700">
                        Price Difference:
                      </span>
                      <span className={`text-lg font-bold ${
                        verdict.percentageOverage > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {verdict.percentageOverage > 0 ? '+' : ''}{verdict.percentageOverage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corruption Premium */}
                {verdict.corruptionPremium > 0 && (
                  <div className="bg-red-100 border-2 border-red-300 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="h-6 w-6 text-red-700 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-red-800 uppercase mb-2">
                          The Corruption Tax
                        </h4>
                        <div className="text-3xl font-bold text-red-900 mb-2">
                          KES {Math.round(verdict.corruptionPremium).toLocaleString()}
                        </div>
                        <p className="text-sm text-red-800">
                          This is the excess amount beyond fair pricing. This money may be going to
                          intermediaries, bribes, or exploitation rather than legitimate business costs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Educational Note */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-blue-900 mb-2">
                    📚 Understanding Fair Pricing
                  </h4>
                  <p className="text-sm text-blue-800">
                    We allow up to <strong>{verdict.acceptableRange}</strong> above baseline to account for
                    transportation, profit margins, and market fluctuations. Anything beyond this threshold
                    is not legitimate business—it's extraction from citizens.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleReset}
                className="bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Check Another Item
              </button>
              <button
                className="bg-gradient-to-r from-red-600 to-pink-600 text-white py-4 rounded-xl font-bold hover:from-red-700 hover:to-pink-700 transition-all shadow-lg"
              >
                Report to Authorities
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SokoHaki;
