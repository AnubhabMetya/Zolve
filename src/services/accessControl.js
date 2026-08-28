// ====================================================================
// ACCESS CONTROL — Role-gated booking/order visibility
// ====================================================================
export const getVisibleBookings = (bookings, user) => {
  if (!user) return [];
  if (user.role === 'admin') return bookings;
  if (user.role === 'customer') {
    return bookings.filter(b => b.customerId === user.id);
  }
  if (user.role === 'executive') {
    if (user.executiveStatus === 'pending_approval') return [];
    // vertical match via category or serviceName inclusion
    const verticalServices = user.assignedServices || [];
    return bookings.filter(b => {
      if (b.assignedExecutiveId && b.assignedExecutiveId === user.id) return true;
      // fallback: if we have no assignment, show bookings whose serviceName is in vertical
      if (verticalServices.includes(b.serviceName)) return true;
      // also category mapping
      if (user.executiveVertical === 'household' && b.category === 'Household') return true;
      if (user.executiveVertical === 'personal' && b.category === 'Personal') return true;
      if (user.executiveVertical === 'community' && b.category === 'Community') return true;
      return false;
    });
  }
  if (user.role === 'provider') {
    return bookings.filter(b => b.providerId === user.providerId || b.providerId === user.id);
  }
  if (user.role === 'society_admin') {
    return bookings.filter(b => b.category === 'Community');
  }
  return [];
};

export const canViewOrderDetails = (user) => {
  if (!user) return false;
  // Executives must be mobileVerified and active; customers can view own details only after verified (mobileVerified or verifiedAt)
  if (user.role === 'executive') return user.mobileVerified === true && user.executiveStatus === 'active';
  if (user.role === 'admin' || user.role === 'society_admin' || user.role === 'provider') return true;
  if (user.role === 'customer') return true; // own booking details allowed, but listing already filtered
  return false;
};

export const isExecutivePending = (user) => user?.role === 'executive' && user?.executiveStatus === 'pending_approval';
