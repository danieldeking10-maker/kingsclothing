import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { reportError, LogLevel } from '../lib/errorReporting';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log the error to our monitoring system
    reportError(error, LogLevel.FATAL, {
      componentStack: errorInfo.componentStack,
      type: 'react_component_crash'
    });
  }

  private handleReset = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 selection:bg-accent/30 text-white">
          <div className="max-w-2xl w-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 p-12 rounded-[3rem] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <ShieldAlert className="w-48 h-48 text-accent" strokeWidth={1} />
              </div>

              <div className="relative z-10">
                <div className="bg-red-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>

                <h1 className="text-4xl md:text-6xl font-display font-black uppercase italic tracking-tighter text-white mb-6">
                  System Critical<span className="text-accent">.</span>
                </h1>
                
                <p className="text-white/40 text-[11px] font-black uppercase tracking-widest leading-relaxed mb-12 max-w-md mx-auto italic">
                  A high-level structural anomaly has been detected in the application layer. Our automated recovery protocols have been engaged.
                </p>

                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-12 p-6 bg-black/40 border border-white/5 rounded-2xl text-left overflow-auto max-h-[200px]">
                    <p className="text-red-400 font-mono text-[10px] break-all mb-2 font-black uppercase">
                      Error Output: {this.state.error?.toString()}
                    </p>
                    <pre className="text-white/20 font-mono text-[9px] leading-tight">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={this.handleReset}
                    className="w-full sm:w-auto px-10 py-5 bg-white text-black rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-accent transition-all flex items-center justify-center gap-3 group"
                  >
                    <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    Reset Environment
                  </button>
                  <a
                    href="/"
                    className="w-full sm:w-auto px-10 py-5 bg-white/5 text-white rounded-full font-black uppercase text-[10px] tracking-widest border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                  >
                    <Home className="w-4 h-4" />
                    Return Home
                  </a>
                </div>
              </div>
            </motion.div>

            <div className="mt-8 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/10">
                Error Identifier: {Math.random().toString(36).substring(2, 10).toUpperCase()} • Auto-Reported
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
