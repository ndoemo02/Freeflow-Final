/**
 * Global module declarations for JavaScript files imported into TypeScript
 * Using wildcard patterns to catch all import paths
 */

// JSX Components - default exports
declare module '*.jsx' {
  import React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
  export const useCart: () => any;
  export const CartProvider: React.ComponentType<any>;
  export const useTheme: () => any;
  export const ThemeProvider: React.ComponentType<any>;
  export const useSpeechRecognition: (opts?: any) => any;
}

// JS modules with named exports
declare module '*.js' {
  export const voiceStateManager: any;
  export const useSpeechRecognition: (opts?: any) => any;
  const defaultExport: any;
  export default defaultExport;
}
