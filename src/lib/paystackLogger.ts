import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface PaystackLogEntry {
  timestamp: string;
  context: string;
  config: {
    reference: string;
    amount: number; // in GHS (original decimal) or sub-units
    email: string;
  };
  response: any;
  validation: {
    isValid: boolean;
    hasReference: boolean;
    hasStatus: boolean;
    statusMatch: boolean;
    reason?: string;
  };
}

export interface PaystackValidationResult {
  isValid: boolean;
  errors: string[];
  reference?: string;
  status?: string;
}

export function validatePaystackResponse(response: any): PaystackValidationResult {
  const errors: string[] = [];
  const returnedReference = response?.reference || response?.id || response?.transaction || undefined;
  const returnedStatus = response?.status ? String(response.status).toLowerCase() : '';
  const returnedMessage = response?.message ? String(response.message).toLowerCase() : '';

  if (!response || typeof response !== 'object') {
    errors.push('Response payload is missing or invalid.');
  }

  if (!returnedReference) {
    errors.push('Response is missing a transaction reference.');
  }

  const containsFailureWords =
    returnedStatus.includes('fail') ||
    returnedStatus.includes('declined') ||
    returnedStatus.includes('cancel') ||
    returnedMessage.includes('fail') ||
    returnedMessage.includes('declined');

  const hasSuccessSignal =
    returnedStatus === 'success' ||
    returnedStatus === 'successful' ||
    returnedMessage === 'approved' ||
    returnedMessage === 'success';

  if (containsFailureWords) {
    errors.push('Response contains an explicit failed, declined, or cancelled status.');
  } else if (!hasSuccessSignal) {
    errors.push('Response does not contain a recognized success status.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    reference: returnedReference,
    status: response?.status,
  };
}

/**
 * Validates and logs a Paystack callback response structurally.
 * Returns { isValid: boolean, reason?: string } to authorize or reject the order write command.
 */
export async function logPaystackCallback(
  context: string,
  config: { reference: string; amount: number; email: string },
  response: any
): Promise<{ isValid: boolean; reason?: string }> {
  const timestamp = new Date().toISOString();
  
  // 1. Structural Checks on the response object
  const hasResponse = !!response;
  const returnedReference = response?.reference || response?.id || response?.transaction || null;
  const returnedStatus = response?.status || null;
  const returnedMessage = response?.message || null;
  
  const hasReference = !!returnedReference;
  const hasStatus = !!returnedStatus;
  
  // Paystack pop standard: status should be 'success' or message 'Approved' or 'successful'
  let statusMatch = false;
  let reason = '';
  
  if (!hasResponse) {
    statusMatch = false;
    reason = 'Empty or null response payload returned from Gateway callback.';
  } else if (!hasReference) {
    statusMatch = false;
    reason = 'Missing trans reference identifier in transaction metadata.';
  } else {
    // Check for negative transaction signals
    const lowerStatus = String(returnedStatus).toLowerCase();
    const lowerMsg = String(returnedMessage).toLowerCase();
    
    // In Paystack inline, a successful transaction either has status === 'success' or message === 'Approved'
    const containsFailureWords = 
      lowerStatus.includes('fail') || 
      lowerStatus.includes('declined') || 
      lowerStatus.includes('cancel') ||
      lowerMsg.includes('fail') ||
      lowerMsg.includes('declined');

    if (containsFailureWords) {
      statusMatch = false;
      reason = `Explicit transaction decline detected (Status: ${returnedStatus}, Msg: ${returnedMessage}).`;
    } else {
      // True success conditions
      statusMatch = 
        lowerStatus === 'success' || 
        lowerStatus === 'successful' || 
        lowerMsg === 'approved' || 
        lowerMsg === 'success' ||
        // Support sandbox mocked objects
        response?.status === 'success';
        
      if (!statusMatch) {
         reason = `Ambiguous transaction status was returned: [Status: ${returnedStatus}, Msg: ${returnedMessage}].`;
      }
    }
  }

  const isValid = hasResponse && hasReference && statusMatch;

  const logEntry: PaystackLogEntry = {
    timestamp,
    context,
    config,
    response,
    validation: {
      isValid,
      hasReference,
      hasStatus,
      statusMatch,
      reason: isValid ? undefined : reason
    }
  };

  // 1. Output a pristine, highly visible brand log block into the browser dev console
  console.group(`%c KINGS NETWORKS: PAYSTACK TRANSACTION AUDIT [${isValid ? 'APPROVED' : 'REJECTED'}] `, `background: ${isValid ? '#10B981' : '#EF4444'}; color: #000; font-weight: bold; padding: 4px; border-radius: 4px;`);
  console.log(`%cContext:%c ${context}`, 'color: #9CA3AF; font-weight: bold;', 'color: #FFF;');
  console.log(`%cConfigured Ref:%c ${config.reference}`, 'color: #9CA3AF; font-weight: bold;', 'color: #3B82F6; font-family: monospace;');
  console.log(`%cReturned Ref:%c ${returnedReference || 'N/A'}`, 'color: #9CA3AF; font-weight: bold;', 'color: #10B981; font-family: monospace;');
  console.log(`%cAmount Initiated:%c GHS ${config.amount}`, 'color: #9CA3AF; font-weight: bold;', 'color: #F59E0B; font-weight: bold;');
  console.log(`%cGateway Payload:`, 'color: #9CA3AF; font-weight: bold;', response);
  console.log(`%cValidation Ledger:`, 'color: #9CA3AF; font-weight: bold;', logEntry.validation);
  console.groupEnd();

  // 2. Persist to central ledger in Firestore for auditability by Kings admin and developers
  try {
    await addDoc(collection(db, 'paystack_audit_logs'), {
      ...logEntry,
      createdAt: serverTimestamp()
    });
  } catch (firebaseError) {
    console.warn('Kings Auditing: Failed to persist ledger entry to remote Firestore database:', firebaseError);
    // Continue gracefully - local console verification remains active
  }

  // 3. Keep a fast-access rotating log in client localStorage
  try {
    const localLogsRaw = localStorage.getItem('kings_paystack_debug_logs');
    const localLogs: PaystackLogEntry[] = localLogsRaw ? JSON.parse(localLogsRaw) : [];
    localLogs.unshift(logEntry);
    
    // Keep max 50 entries
    if (localLogs.length > 50) {
      localLogs.pop();
    }
    localStorage.setItem('kings_paystack_debug_logs', JSON.stringify(localLogs));
  } catch (localStorageErr) {
    // Ignore silent local storage errors in private browsing modes
  }

  return { isValid, reason: isValid ? undefined : reason };
}
