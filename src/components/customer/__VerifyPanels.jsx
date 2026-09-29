// TEMPORARY verification harness — deleted after the browser run. Not shipped.
import React from 'react';
import { ProfessionalStatusPanel, AssignedProfessionalCard } from './AssignedProfessionalCard';
import { INITIAL_BOOKINGS, INITIAL_PROVIDERS } from '../../data/mockData';

export const VerifyPanels = () => {
  const assigned = INITIAL_BOOKINGS[0]; // CONFIRMED + prov-rajesh-01
  const registry = INITIAL_PROVIDERS.find((p) => p.id === assigned.providerId) || null;
  const unassignedFresh = { ...assigned, providerId: null, providerName: null, bookingStatus: 'CONFIRMED' };
  // Replacement message appears ONLY for an actual REASSIGNING state with no
  // replacement assigned yet — never for plain assigned/accepted bookings.
  const unassignedReassign = { ...assigned, providerId: null, providerName: null, bookingStatus: 'REASSIGNING' };
  const bookingOnly = { ...assigned, providerId: 'prov-missing' };
  const ghost = { id: 'bk-ghost', bookingCode: 'ZOL-0', providerId: null, bookingStatus: 'CONFIRMED' };
  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 py-8">
      <div data-testid="panel-finding">
        <ProfessionalStatusPanel booking={unassignedFresh} provider={null} totalAmount={100} />
      </div>
      <div data-testid="panel-replacement">
        <ProfessionalStatusPanel booking={unassignedReassign} provider={null} totalAmount={100} />
      </div>
      <div data-testid="panel-assigned">
        <ProfessionalStatusPanel booking={assigned} provider={registry} totalAmount={assigned.totalAmount} />
      </div>
      <div data-testid="panel-bookingonly">
        <AssignedProfessionalCard booking={bookingOnly} provider={null} totalAmount={100} />
      </div>
      <div data-testid="panel-ghost">
        <AssignedProfessionalCard booking={ghost} provider={null} totalAmount={100} />
      </div>
    </div>
  );
};
