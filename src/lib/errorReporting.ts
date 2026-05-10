import { auth, db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface AppError {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: any;
  userId?: string | null;
  userAgent: string;
  url: string;
  level: LogLevel;
  context?: Record<string, any>;
}

/**
 * Reports an error to Firestore for debugging and monitoring.
 */
export async function reportError(
  error: Error | string, 
  level: LogLevel = LogLevel.ERROR, 
  context?: Record<string, any>
) {
  const message = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;
  
  const errorLog: AppError = {
    message,
    stack,
    timestamp: serverTimestamp(),
    userId: auth.currentUser?.uid || null,
    userAgent: navigator.userAgent,
    url: window.location.href,
    level,
    context
  };

  console.error(`[AppError] ${level.toUpperCase()}: ${message}`, { error, context });

  try {
    // Only attempt to log to Firestore if we have a connection and aren't in a recursive error state
    await addDoc(collection(db, 'system_logs'), errorLog);
  } catch (e) {
    console.error('Failed to log error to Firestore:', e);
  }
}

/**
 * Global handlers for unhandled promise rejections and runtime errors
 */
export function initGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    reportError(event.error || event.message, LogLevel.FATAL, { type: 'runtime_error' });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, LogLevel.ERROR, { type: 'unhandled_rejection' });
  });
}
