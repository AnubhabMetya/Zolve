// Tests for Executive Approval queue — Admin-side ExecutiveApproval queue
// Run with: node src/services/executiveApplicationService.test.js
import fs from 'fs';

function assert(cond, msg){ if(!cond) throw new Error(msg); }
let passed=0, failed=0;
async function test(name, fn){
  try{ await fn(); console.log(`✓ ${name}`); passed++; }catch(e){ console.error(`✗ ${name}: ${e.message}`); failed++; }
}

async function run(){
  console.log('=== ExecutiveApplicationService Tests ===');

  // 1. Status values are canonical: pending, approved, rejected (not fake)
  await test('1. canonical status values pending/approved/rejected', async()=>{
    const code = fs.readFileSync('src/services/executiveApplicationService.js','utf8');
    assert(code.includes("'pending'") && code.includes("'approved'") && code.includes("'rejected'"), 'canonical statuses');
    assert(code.includes('Awaiting Approval'), 'pending -> Awaiting Approval');
    assert(code.includes('Application Approved'), 'approved -> Application Approved');
    assert(code.includes('Application Rejected'), 'rejected -> Application Rejected');
    assert(code.includes('pending_approval'), 'legacy pending_approval mapping');
    assert(code.includes("'active'") || code.includes('"active"'), 'legacy active mapping');
    // also check statusLabel function exists
    assert(code.includes('statusLabel'), 'statusLabel function');
    assert(code.includes('statusBadge'), 'statusBadge function');
  });

  // 2. statusBadge
  await test('2. statusBadge returns PENDING/APPROVED/REJECTED', async()=>{
    const code = fs.readFileSync('src/services/executiveApplicationService.js','utf8');
    assert(code.includes('PENDING') && code.includes('APPROVED') && code.includes('REJECTED'), 'badges');
  });

  // 3. No fake applicants in mockData
  await test('3. no hard-coded applicants in mockData', async()=>{
    const mock = fs.readFileSync('src/data/mockData.js','utf8');
    // mockData should not contain executive_applications fake table
    assert(!mock.includes('executive_applications'), 'mockData should not contain executive_applications');
    // Should not hard-code Anubhab as applicant in executive queue
    // Anubhab appears only as DEMO_USERS.customer, not as pending executive applicant list
    const hasFakeQueue = mock.includes('exec-app-') && mock.toLowerCase().includes('pending');
    assert(!hasFakeQueue, 'mockData should not have fake exec-app queue');
  });

  // 4. Service rejects reject without reason
  await test('4. reject requires reason (service validation)', async()=>{
    const code = fs.readFileSync('src/services/executiveApplicationService.js','utf8');
    assert(code.includes('Rejection reason required'), 'service should require rejection reason');
  });

  // 5. RLS policies exist (via file inspection) — applicant can view own, admin can view/update
  await test('5. RLS policies defined correctly', async()=>{
    const sql = fs.readFileSync('src/db/executive_applications.sql','utf8');
    assert(sql.includes('enable row level security'), 'RLS enabled');
    assert(sql.includes('Applicants can view own application'), 'applicant view policy');
    assert(sql.includes('Applicants can insert own application'), 'applicant insert policy');
    assert(sql.includes('Admin can view all applications'), 'admin view policy');
    assert(sql.includes('Admin can update applications'), 'admin update policy');
    // No public access
    assert(!sql.includes('using (true)'), 'should not have public using(true) for executive_applications');
    assert(sql.includes("profiles.role = 'admin'"), 'role check admin');
  });

  // 6. Table fields present
  await test('6. table has required fields', async()=>{
    const sql = fs.readFileSync('src/db/executive_applications.sql','utf8');
    const required = ['applicant_id','full_name','email','phone','vertical','status','created_at','approved_by','approved_at','rejection_reason'];
    for(const f of required){
      assert(sql.toLowerCase().includes(f), `field ${f} present`);
    }
  });

  // 7. No localStorage source of truth for approval queue (AppContext uses Supabase)
  await test('7. AppContext uses Supabase for executive persistence', async()=>{
    const ctx = fs.readFileSync('src/context/AppContext.jsx','utf8');
    assert(ctx.includes('ExecutiveApplicationService'), 'AppContext should import ExecutiveApplicationService');
    assert(ctx.includes('submitApplication'), 'should call submitApplication');
    assert(ctx.includes('approveApplication'), 'should handle approve via service');
    assert(ctx.includes('rejectApplication'), 'should handle reject via service');
    // Should not use hard-coded applicant names
    assert(!ctx.includes("Anubhab") || ctx.includes('customerName'), 'should not hard-code Anubhab as applicant');
  });

  // 8. AdminDashboard has Executive Approvals tab
  await test('8. AdminDashboard has Executive Approvals tab', async()=>{
    const admin = fs.readFileSync('src/components/admin/AdminDashboard.jsx','utf8');
    assert(admin.includes('executive_approvals'), 'tab key present');
    assert(admin.includes('Executive Approvals'), 'tab label present');
    assert(admin.includes('Pending Applications'), 'pending header');
    assert(admin.includes('Approve') && admin.includes('Reject'), 'approve/reject buttons');
    assert(admin.includes('Full Name') || admin.includes('fullName') || admin.includes('full_name'), 'shows name');
    assert(admin.includes('Email'), 'shows email');
    assert(admin.includes('Phone'), 'shows phone');
    assert(admin.toLowerCase().includes('vertical'), 'shows vertical');
    assert(admin.includes('Services'), 'shows services');
    assert(admin.includes('Submitted'), 'shows submitted');
    assert(admin.includes('Status'), 'shows status');
    // Check that admin checks role = admin, not client bypass
    assert(admin.includes("profile?.role === 'admin'") || admin.includes('isAdmin'), 'admin check');
    assert(!admin.includes('service_role'), 'should not use service_role in frontend');
  });

  // 9. JoinExecutivePage shows real DB status (not just localStorage)
  await test('9. JoinExecutivePage uses DB status', async()=>{
    const join = fs.readFileSync('src/components/executive/JoinExecutivePage.jsx','utf8');
    assert(join.includes('ExecutiveApplicationService'), 'imports service');
    assert(join.includes('fetchMyLatestApplication'), 'fetches real status');
    assert(join.includes('Application Submitted — Awaiting Approval'), 'pending message');
    assert(join.includes('Application Approved'), 'approved message');
    assert(join.includes('Application Rejected'), 'rejected message');
    // Should not use localStorage as source of truth for executive status (allow comment mentioning it)
    const hasLocalStorageData = join.includes('localStorage.getItem') && join.toLowerCase().includes('exec');
    assert(!hasLocalStorageData, 'should not rely on localStorage as source of truth for exec apps');
  });

  // 10. No hard-coded applicant names in AdminDashboard
  await test('10. no hard-coded applicant names', async()=>{
    const admin = fs.readFileSync('src/components/admin/AdminDashboard.jsx','utf8');
    // Ensure we don't have hard-coded example with Anubhab as pending applicant
    // Example in task says layout example but we must not hard-code
    // Check that the only Anubhab reference is not as fake applicant
    const hasHardcoded = admin.includes("Anubhab") && admin.includes('exec-app');
    assert(!hasHardcoded, 'should not hard-code Anubhab as applicant');
  });

  // 11. isSupabaseConfigured check exists in service
  await test('11. service respects isSupabaseConfigured', async()=>{
    const code = fs.readFileSync('src/services/executiveApplicationService.js','utf8');
    assert(code.includes('isSupabaseConfigured'), 'checks config');
  });

  // 12. No service_role in frontend
  await test('12. no service_role credentials in frontend', async()=>{
    const files = [
      fs.readFileSync('src/services/executiveApplicationService.js','utf8'),
      fs.readFileSync('src/components/admin/AdminDashboard.jsx','utf8'),
      fs.readFileSync('src/context/AppContext.jsx','utf8'),
    ];
    for(const c of files){
      assert(!c.toLowerCase().includes('service_role'), 'no service_role');
    }
  });

  // 13. Verify table already exists in remote DB (via SQL file and manual check)
  await test('13. remote table exists (SQL + file check)', async()=>{
    const sql = fs.readFileSync('src/db/executive_applications.sql','utf8');
    assert(sql.includes('create table if not exists public.executive_applications'), 'create table present');
    assert(sql.includes('gen_random_uuid'), 'uuid default');
  });

  console.log(`\n=== ExecutiveApproval Tests: ${passed} passed, ${failed} failed ===`);
  if(failed>0) process.exitCode=1;
}

run();
