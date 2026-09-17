// ====================================================================
// CERTIFICATION SERVICE — Skill Training Academy + quiz + verifiable cert
// ====================================================================
const LS_KEY = 'zolve_certs_v1';

function load() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } }
function save(arr) { try { localStorage.setItem(LS_KEY, JSON.stringify(arr)); } catch {} }

const QUIZ_BANK = {
  default: [
    { q: 'What is the first step before working on live electrical wiring?', a: ['Isolate MCB & test with tester', 'Directly touch wire', 'Use wet hands'], correct: 0 },
    { q: 'Correct P-trap to prevent drain leakage?', a: ['Water seal maintains, check slope 2%', 'Any slope works', 'No seal needed'], correct: 0 },
    { q: 'Cooperative fair wage principle?', a: ['88% provider payout + transparent 8% platform + 4% welfare', '50% deduction', 'No payout'], correct: 0 },
  ]
};

export const getQuizForModule = (moduleId) => QUIZ_BANK[moduleId] || QUIZ_BANK.default;

export const submitQuiz = ({ moduleId, moduleName, providerId, providerName, answers }) => {
  const quiz = getQuizForModule(moduleId);
  let score = 0;
  quiz.forEach((item, idx) => { if (answers[idx] === item.correct) score++; });
  const passed = score >= Math.ceil(quiz.length * 0.66); // 66% pass
  const cert = {
    id: `cert_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    moduleId, moduleName, providerId, providerName,
    score, total: quiz.length, passed,
    status: passed ? 'certified' : 'failed',
    issuedAt: new Date().toISOString(),
    validTill: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
    certNo: `ZOLVE-NSQF-${Date.now().toString().slice(-6)}`,
  };
  const arr = load();
  arr.unshift(cert);
  save(arr);
  try { window.dispatchEvent(new CustomEvent('zolve:cert', { detail: { type: passed ? 'CERT_ISSUED' : 'CERT_FAILED', cert } })); } catch {}
  return cert;
};

export const getCertsForProvider = (providerId) => load().filter(c => c.providerId === providerId);
export const getAllCerts = () => load();
export const clearCerts = () => save([]);
