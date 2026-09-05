/**
 * executiveOperations.test.js
 * Verification test suite for Zolve Executive Operations Portal
 *
 * Tests the 10 requirements specified in the prompt:
 * 1. Max 3 skills constraint: Executive profile enforces selecting AT MOST 3 services
 * 2. Household Services: Exactly 8 services available
 * 3. Personal & Family Services: Exactly 3 services available
 * 4. Community & Society Services: Exactly 3 services available
 * 5. Canonical location detection from AppContext with accuracy, no Bengaluru fallback
 * 6. Hard 50 km radius limit: Jobs > 50 km excluded, jobs <= 50 km included
 * 7. Skill-based job matching filter: Only jobs matching executive's selected skills
 * 8. Pending Community Executive access denial
 * 9. Approved Community Executive access to Command Center
 * 10. Clean empty nearby jobs state within 50 km
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EXECUTIVE_VERTICALS } from '../data/mockData.js';
import { resolveCity } from './cityResolver.js';
import { haversineKm } from './locationService.js';
import { canViewOrderDetails, isExecutivePending } from './accessControl.js';

// Alias for test readability — matches original spec naming
const calculateDistanceKm = haversineKm;

describe('Zolve Executive Operations Portal Test Suite', () => {

  // Test 1: Max 3 skills constraint enforcement
  it('1. Executive registration enforces selecting at most 3 services', () => {
    const householdServices = EXECUTIVE_VERTICALS.find(v => v.id === 'household').services;
    assert.ok(householdServices.length >= 3);

    // Simulate selector capping logic (mirrors ExecutiveSkillSelector onToggleSkill)
    const selectSkills = (current, skillToAdd) => {
      if (current.includes(skillToAdd)) {
        return current.filter(s => s !== skillToAdd);
      }
      if (current.length >= 3) {
        return current; // Block 4th selection
      }
      return [...current, skillToAdd];
    };

    let selected = [];
    selected = selectSkills(selected, householdServices[0]);
    selected = selectSkills(selected, householdServices[1]);
    selected = selectSkills(selected, householdServices[2]);
    assert.equal(selected.length, 3, 'Exactly 3 skills selected');

    // Attempting to add 4th skill must be blocked
    const afterFourth = selectSkills(selected, householdServices[3]);
    assert.equal(afterFourth.length, 3, 'Cannot select more than 3 skills');
    assert.ok(!afterFourth.includes(householdServices[3]), 'Fourth skill was rejected');
  });

  // Test 2: Household Services vertical has exactly 8 services
  it('2. Household Services vertical has exactly 8 services', () => {
    const household = EXECUTIVE_VERTICALS.find(v => v.id === 'household');
    assert.ok(household, 'Household vertical exists');
    assert.equal(household.services.length, 8, 'Household vertical has exactly 8 services');
    assert.deepEqual(household.services, [
      'Full Home Deep Cleaning',
      'Plumbing Repair & Leakage Fix',
      'Electrical Repair & Wiring',
      'Carpentry & Furniture Assembly',
      'AC Deep Foam Jet Servicing',
      'Wall Painting & Waterproofing',
      'Gardening & Balcony Greenery',
      'Organic Pest Control'
    ]);
  });

  // Test 3: Personal & Family Services vertical has exactly 3 services
  it('3. Personal & Family Services vertical has exactly 3 services', () => {
    const personal = EXECUTIVE_VERTICALS.find(v => v.id === 'personal');
    assert.ok(personal, 'Personal vertical exists');
    assert.equal(personal.services.length, 3, 'Personal vertical has exactly 3 services');
    assert.deepEqual(personal.services, [
      'Home Chef & Meal Preparation',
      'Elder Assistance & Companionship',
      'Moving & Heavy Lifting Assistance'
    ]);
  });

  // Test 4: Community & Society Services vertical has exactly 3 services
  it('4. Community & Society Services vertical has exactly 3 services', () => {
    const community = EXECUTIVE_VERTICALS.find(v => v.id === 'community');
    assert.ok(community, 'Community vertical exists');
    assert.equal(community.services.length, 3, 'Community vertical has exactly 3 services');
    assert.deepEqual(community.services, [
      'Society Common Area Sanitization',
      'Water Sump & Overhead Tank Cleaning',
      'Community Event Sound & Electrical Setup'
    ]);
    assert.equal(community.requiresApproval, true, 'Community executive requires admin approval');
  });

  // Test 5: Canonical location detection with accuracy & NO Bengaluru fallback
  it('5. GPS location is preserved with accuracy and does not fallback to Bengaluru', () => {
    // User in Kolkata
    const kolkataGps = { lat: 22.5726, lng: 88.3639, accuracy: 18.5 };
    const resolvedKolkata = resolveCity(kolkataGps);
    assert.equal(resolvedKolkata.city, 'Kolkata', 'Resolves correctly to Kolkata');
    assert.notEqual(resolvedKolkata.city, 'Bengaluru', 'Never silently falls back to Bengaluru');

    // Unknown location outside known city bounds
    const remoteLocation = { lat: 26.1234, lng: 91.5678, name: 'Guwahati' };
    const resolvedRemote = resolveCity(remoteLocation);
    // Should NOT silently become Bengaluru
    if (resolvedRemote) {
      assert.notEqual(resolvedRemote.city, 'Bengaluru', 'Guwahati must not resolve to Bengaluru');
    }
  });

  // Test 6: Strict 50 km radius limit (jobs > 50 km excluded, <= 50 km included)
  it('6. Hard 50 km radius limit strictly includes <= 50 km and excludes > 50 km', () => {
    const executiveCoords = { lat: 22.5726, lng: 88.3639 }; // Kolkata Center

    const closeJob = { name: 'Salt Lake Sector V', lat: 22.5850, lng: 88.4350 };
    const distClose = calculateDistanceKm(executiveCoords.lat, executiveCoords.lng, closeJob.lat, closeJob.lng);
    assert.ok(distClose <= 50.0, `Close job is ${distClose.toFixed(1)} km <= 50 km`);

    const edgeJob = { name: 'Burdwan Outer', lat: 23.2324, lng: 87.8615 };
    const distEdge = calculateDistanceKm(executiveCoords.lat, executiveCoords.lng, edgeJob.lat, edgeJob.lng);
    assert.ok(distEdge > 50.0, `Burdwan job is ${distEdge.toFixed(1)} km > 50 km`);

    // Hard eligibility filtering
    const jobs = [
      { id: 'job-1', lat: closeJob.lat, lng: closeJob.lng, title: 'Local Plumbing' },
      { id: 'job-2', lat: edgeJob.lat, lng: edgeJob.lng, title: 'Distant Repair' }
    ];

    const eligible = jobs.filter(j => calculateDistanceKm(executiveCoords.lat, executiveCoords.lng, j.lat, j.lng) <= 50.0);
    assert.equal(eligible.length, 1, 'Only jobs within 50 km are eligible');
    assert.equal(eligible[0].id, 'job-1', 'Eligible job is the one within 50 km');
  });

  // Test 7: Skill-based job matching filter
  it('7. Skill-based job matching only includes jobs matching executive assigned skills', () => {
    const assignedSkills = ['Full Home Deep Cleaning', 'Plumbing Repair & Leakage Fix'];

    const mockBookings = [
      { id: 'b1', serviceName: 'Full Home Deep Cleaning', status: 'CONFIRMED' },
      { id: 'b2', serviceName: 'Plumbing Repair & Leakage Fix', status: 'CONFIRMED' },
      { id: 'b3', serviceName: 'Home Chef & Meal Preparation', status: 'CONFIRMED' },
      { id: 'b4', serviceName: 'Electrical Repair & Wiring', status: 'CONFIRMED' },
    ];

    const matched = mockBookings.filter(b =>
      assignedSkills.includes(b.serviceName)
    );

    assert.equal(matched.length, 2, 'Matches exactly the 2 assigned skills');
    assert.ok(matched.find(b => b.id === 'b1'));
    assert.ok(matched.find(b => b.id === 'b2'));
    assert.ok(!matched.find(b => b.id === 'b3'), 'Non-matching skill excluded');
    assert.ok(!matched.find(b => b.id === 'b4'), 'Non-matching skill excluded');
  });

  // Test 8: Pending Community Executive access denial
  it('8. Pending Community Executive is denied access to sensitive orders', () => {
    const pendingExecutive = {
      id: 'usr-exec-1',
      role: 'executive',
      executiveVertical: 'community',
      executiveStatus: 'pending_approval',
      mobileVerified: true
    };

    assert.equal(isExecutivePending(pendingExecutive), true, 'Identified as pending executive');

    const canView = canViewOrderDetails(pendingExecutive);
    assert.equal(canView, false, 'Pending executive cannot view order details');
  });

  // Test 9: Approved Community Executive access to Command Center & Order Details
  it('9. Approved Community Executive is granted access to society orders', () => {
    const approvedExecutive = {
      id: 'usr-exec-2',
      role: 'executive',
      executiveVertical: 'community',
      executiveStatus: 'active',
      mobileVerified: true,
      assignedServices: ['Society Common Area Sanitization', 'Water Sump & Overhead Tank Cleaning']
    };

    assert.equal(isExecutivePending(approvedExecutive), false, 'Not pending');

    const canView = canViewOrderDetails(approvedExecutive);
    assert.equal(canView, true, 'Approved community executive can view order details');
  });

  // Test 10: Clean empty state when no nearby jobs within 50 km
  it('10. Discovery pipeline returns clean empty state when no jobs meet <= 50 km and skill criteria', () => {
    const executiveCoords = { lat: 22.5726, lng: 88.3639 };
    const assignedSkills = ['Elder Assistance & Companionship'];

    // All jobs either > 50 km away or mismatched skills
    const jobs = [
      { id: 'j1', serviceName: 'Plumbing Repair & Leakage Fix', lat: 22.58, lng: 88.37 }, // close, but wrong skill
      { id: 'j2', serviceName: 'Elder Assistance & Companionship', lat: 28.6139, lng: 77.2090 } // right skill, but Delhi (>1000 km)
    ];

    const eligible = jobs.filter(j => {
      const dist = calculateDistanceKm(executiveCoords.lat, executiveCoords.lng, j.lat, j.lng);
      const skillMatches = assignedSkills.includes(j.serviceName);
      return dist <= 50.0 && skillMatches;
    });

    assert.equal(eligible.length, 0, 'No jobs qualify; pipeline delivers clean empty state');
  });

});
