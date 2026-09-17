// ====================================================================
// KYC SERVICE — Document upload + verification flow
// Supabase Storage bucket `kyc-docs` when configured, else localStorage fallback for demo
// ====================================================================
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const LS_KEY = 'zolve_kyc_docs_v1';

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function saveLocal(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

export const uploadKycDocument = async ({ providerId, file, docType = 'govt_id' }) => {
  const fileName = `${providerId}/${Date.now()}_${file.name}`;
  if (isSupabaseConfigured()) {
    try {
      const { error: upErr } = await supabase.storage.from('kyc-docs').upload(fileName, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('kyc-docs').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl || fileName;
      // also persist URL in local map for admin quick view
      const local = loadLocal();
      local[providerId] = { url: publicUrl, fileName, docType, uploadedAt: new Date().toISOString(), status: 'pending', originalName: file.name };
      saveLocal(local);
      // optionally update providers.kyc_document_url via RPC — best-effort
      try { await supabase.from('providers').update({ kyc_document_url: publicUrl }).eq('id', providerId); } catch {}
      return { success: true, url: publicUrl, fileName, isMock: false };
    } catch (e) {
      console.warn('Supabase KYC upload failed, falling back to local mock', e);
    }
  }
  // Local mock fallback — store object URL (demo only, not persistent across devices)
  const mockUrl = URL.createObjectURL(file);
  const local = loadLocal();
  local[providerId] = { url: mockUrl, fileName, docType, uploadedAt: new Date().toISOString(), status: 'pending', originalName: file.name, isMock: true };
  saveLocal(local);
  return { success: true, url: mockUrl, fileName, isMock: true };
};

export const getKycDoc = (providerId) => {
  const local = loadLocal();
  return local[providerId] || null;
};

export const getAllKycDocs = () => loadLocal();

export const verifyKyc = async (providerId, approved = true) => {
  const local = loadLocal();
  if (local[providerId]) {
    local[providerId].status = approved ? 'verified' : 'rejected';
    local[providerId].verifiedAt = new Date().toISOString();
    saveLocal(local);
  }
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('providers').update({ kyc_status: approved ? 'verified' : 'rejected' }).eq('id', providerId);
    } catch {}
  }
  return { success: true, status: approved ? 'verified' : 'rejected' };
};

export const clearKyc = (providerId) => {
  const local = loadLocal();
  delete local[providerId];
  saveLocal(local);
};
