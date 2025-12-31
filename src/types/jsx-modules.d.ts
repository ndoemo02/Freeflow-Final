// Generic module declarations for importing .jsx components into .tsx files
// This prevents TS from erroring on missing type declarations for JSX modules.
declare module '*.jsx' {
  import React from 'react';
  const Component: React.ComponentType<any>;
  export default Component;
}




