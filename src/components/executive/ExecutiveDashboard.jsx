import React from 'react';
import { useApp } from '../../context/AppContext';
import { getVisibleBookings, isExecutivePending } from '../../services/accessControl';
import { ShieldCheck, Clock, Phone, Mail } from 'lucide-react';

export const ExecutiveDashboard = () => {
  const { currentUser, bookings, setActiveBookingForTracking } = useApp();
  if (!currentUser || currentUser.role !== 'executive') return null;
  if (isExecutivePending(currentUser)) {
    return (
      <div className="py-12 text-center space-y-4 max-w-xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto"><Clock className="w-8 h-8 text-amber-600" /></div>
        <h2 className="text-xl font-bold">Pending Society Admin Approval</h2>
        <p className="text-sm text-slate-600">Your Community & Society executive access is awaiting approval. You will be notified once activated.</p>
        <div className="p-3 rounded-xl bg-slate-50 border text-xs text-left">
          <div>Vertical: <strong>{currentUser.executiveVertical}</strong> — Status: <strong className="text-amber-700">{currentUser.executiveStatus}</strong></div>
          <div className="mt-1">Mobile Verified: {currentUser.mobileVerified ? 'Yes' : 'No'} — Phone: {currentUser.phone}</div>
        </div>
      </div>
    );
  }
  const visible = getVisibleBookings(bookings, currentUser);
  return (
    <div className="space-y-6 pb-16">
      <div className="bg-white rounded-3xl p-6 border shadow-subtle flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold font-display">Executive Dashboard — {currentUser.executiveVertical}</h1>
          <p className="text-xs text-slate-500">Mobile verified <ShieldCheck className="w-3 h-3 inline text-coop-600" /> {currentUser.phone} — Assigned: {currentUser.assignedServices?.join(', ')}</p>
        </div>
        <span className="px-3 py-1 rounded-full bg-coop-50 text-coop-700 text-xs font-bold border border-coop-200">Active</span>
      </div>
      {visible.length===0 ? <div className="text-center py-12 text-slate-500 text-sm">No orders in your vertical yet.</div> : (
        <div className="space-y-4">
          {visible.map(b=> (
            <div key={b.id} className="p-5 rounded-2xl bg-white border shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex gap-3">
                <img src={b.providerAvatar} alt={b.providerName} className="w-14 h-14 rounded-xl object-cover" />
                <div>
                  <div className="flex gap-2 items-center"><span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold">#{b.bookingCode}</span><span className="text-sm font-bold">{b.serviceName}</span></div>
                  <div className="text-xs text-slate-500">Customer: {b.customerName} — {b.scheduledDate} {b.scheduledTime}</div>
                  <div className="text-[11px] text-slate-400">Address: {b.address}</div>
                </div>
              </div>
              <button onClick={()=>setActiveBookingForTracking(b)} className="px-4 py-2 rounded-xl bg-brand-900 text-white text-xs font-bold">View Details (OTP verified)</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
