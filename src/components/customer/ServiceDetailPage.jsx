import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getCategoryById } from '../../data/serviceCatalog.js';
import { MicroServiceCard } from './MicroServiceCard.jsx';
import { StickyCartBar } from './StickyCartBar.jsx';

export const ServiceDetailPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const category = getCategoryById(categoryId);

  if (!category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Service not found</h1>
        <button onClick={() => navigate('/')} className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold">
          Back to Services
        </button>
      </div>
    );
  }

  const activeItems = category.items.filter((i) => i.active !== false);

  return (
    <div className="pb-28">
      <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Services
      </button>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 uppercase tracking-tight">{category.name}</h1>
      <p className="text-sm text-slate-500 mt-1">{category.tagline}</p>
      {category.blurb && <p className="text-xs text-slate-400 mt-1">{category.blurb}</p>}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {activeItems.map((item) => (
          <MicroServiceCard key={item.id} item={item} categoryIllustration={category.illustration} />
        ))}
      </div>
      <StickyCartBar />
    </div>
  );
};
