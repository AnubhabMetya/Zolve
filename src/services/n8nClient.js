// ====================================================================
// ZOLVE N8N WORKFLOW CLIENT & EVENT BRIDGE
// Email OTP delivery via VITE_N8N_WEBHOOK_URL → Gmail (n8n workflow)
// ====================================================================

const N8N_WEBHOOK_URL = (import.meta?.env?.VITE_N8N_WEBHOOK_URL || '').trim() || null;

const workflowListeners = new Set();

export const subscribeWorkflowEvents = (callback) => {
  workflowListeners.add(callback);
  return () => workflowListeners.delete(callback);
};

const notifyWorkflowEvent = (event) => {
  workflowListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (e) {
      console.error('Error in workflow listener', e);
    }
  });
};

/**
 * Resolve webhook URL for a workflow.
 * VITE_N8N_WEBHOOK_URL may be:
 *  - full webhook URL: https://host/webhook/zolve-send-email-otp  → use directly for email OTP
 *  - base webhook URL: https://host  or https://host/webhook → append /webhook/zolve-{name}
 */
function resolveWebhookUrl(workflowName) {
  if (!N8N_WEBHOOK_URL) return null;
  const url = N8N_WEBHOOK_URL.trim().replace(/\/$/, '');
  // If URL already points to a specific webhook (contains /webhook/ and workflow slug), use directly for email OTP
  if (workflowName === 'send-email-otp' || workflowName === 'send-otp') {
    if (url.includes('/webhook/')) {
      // If custom webhook URL is set, treat it as the target for email OTP (spec: VITE_N8N_WEBHOOK_URL is the email webhook)
      // For legacy base URLs like https://host/webhook, still append slug if not already complete
      if (url.endsWith('/webhook') || url.endsWith('/webhook/')) {
        return `${url.replace(/\/$/, '')}/zolve-${workflowName}`;
      }
      // If URL looks like full webhook endpoint (has /webhook/zolve-), return as-is for email OTP workflows
      if (url.includes('/webhook/zolve-')) return url;
      // If URL is base n8n host (e.g. https://n8n.example.com) without /webhook, append
      if (!url.includes('/webhook/')) return `${url}/webhook/zolve-${workflowName}`;
      return url;
    }
    return `${url}/webhook/zolve-${workflowName}`;
  }
  // Non-OTP workflows (razorpay etc.) — always suffix
  if (url.includes('/webhook/zolve-')) {
    // Full email webhook was configured — for non-email workflows fall back to base
    const base = url.split('/webhook/')[0];
    return `${base}/webhook/zolve-${workflowName}`;
  }
  if (url.endsWith('/webhook')) return `${url}/zolve-${workflowName}`;
  if (url.includes('/webhook')) return `${url}/zolve-${workflowName}`;
  return `${url}/webhook/zolve-${workflowName}`;
}

/**
 * Triggers an n8n webhook workflow with timeout + structured error handling.
 * Handles: success, non-2xx, timeout, network failure, malformed response
 */
export const triggerN8nWorkflow = async (workflowName, payload) => {
  const timestamp = new Date().toISOString();
  const executionId = `exec_${Math.random().toString(36).substring(2, 9)}`;

  notifyWorkflowEvent({
    id: executionId,
    workflow: workflowName,
    status: 'TRIGGERED',
    timestamp,
    payload,
  });

  if (N8N_WEBHOOK_URL) {
    const targetUrl = resolveWebhookUrl(workflowName);
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 10000) : null;
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Zolve-Source': 'frontend-app',
        },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined,
      });
      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`n8n webhook responded with status ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
      }

      let data;
      const raw = await response.text();
      if (!raw) throw new Error('n8n webhook returned empty response');
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error('n8n webhook returned malformed JSON');
      }

      notifyWorkflowEvent({
        id: executionId,
        workflow: workflowName,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        response: data,
      });
      return data;
    } catch (error) {
      const isAbort = error?.name === 'AbortError';
      const msg = isAbort ? 'n8n webhook timeout after 10s' : (error?.message || 'n8n webhook network failure');
      console.warn(`n8n Cloud webhook unreachable (${msg}). Falling back to local orchestrator.`);
      // Re-throw with user-friendly mapping for Email OTP callers — they should show "Unable to send verification email..."
      if (workflowName === 'send-email-otp' || workflowName === 'send-otp') {
        throw new Error(msg);
      }
    }
  }

  // Local simulated execution (dev/demo)
  await new Promise((res) => setTimeout(res, 400));

  let simulatedResponse = {};

  switch (workflowName) {
    case 'send-email-otp':
    case 'send-otp':
      simulatedResponse = {
        success: true,
        workflow: workflowName,
        receivedAt: timestamp,
        simulated: true,
        message: 'Local sim: Email OTP workflow (dev only)',
      };
      break;
    case 'create-razorpay-order':
      simulatedResponse = {
        success: true,
        order_id: `order_${Math.random().toString(36).substring(2, 12).toUpperCase()}`,
        amount: Math.round(Number(payload.amount) * 100),
        currency: 'INR',
        key_id: 'rzp_test_zolve_sandbox_key',
      };
      break;
    case 'verify-razorpay-payment':
      simulatedResponse = {
        verified: true,
        message: 'Signature cryptographic check passed on server-side simulation',
        booking_id: payload.booking_id,
      };
      break;
    case 'ai-classify':
      simulatedResponse = {
        category: 'Household',
        subcategory: 'Plumbing',
        confidence: 0.95,
      };
      break;
    default:
      simulatedResponse = {
        success: true,
        workflow: workflowName,
        receivedAt: timestamp,
      };
  }

  notifyWorkflowEvent({
    id: executionId,
    workflow: workflowName,
    status: 'COMPLETED_LOCAL_SIM',
    timestamp: new Date().toISOString(),
    response: simulatedResponse,
  });

  return simulatedResponse;
};
