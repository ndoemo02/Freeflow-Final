import React from 'react';

declare module '../components/VoiceTextBox' {
  const Component: React.ComponentType<any>;
  export default Component;
}
declare module '../components/VoiceTextBox.jsx' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '../components/AmberStatus' {
  const Component: React.ComponentType<any>;
  export default Component;
}
declare module '../components/AmberStatus.jsx' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '../components/TTSSwitcher' {
  const Component: React.ComponentType<any>;
  export default Component;
}
declare module '../components/TTSSwitcher.jsx' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '../components/LoadingScreen' {
  const Component: React.ComponentType<any>;
  export default Component;
}
declare module '../components/LoadingScreen.jsx' {
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module '../components/VoiceBar' {
  export const VoiceBar: React.ComponentType<any>;
}
declare module '../components/VoiceBar.jsx' {
  export const VoiceBar: React.ComponentType<any>;
  const _default: any;
  export default _default;
}

declare module '../components/DynamicPopups' {
  export const DynamicPopups: React.ComponentType<any>;
}
declare module '../components/DynamicPopups.jsx' {
  export const DynamicPopups: React.ComponentType<any>;
  const _default: any;
  export default _default;
}


declare module '../components/LogoFreeFlow' {
  const Component: React.ComponentType<any>;
  export default Component;
}
declare module '../components/LogoFreeFlow.jsx' {
  const Component: React.ComponentType<any>;
  export default Component;
}

// Cart and CartContext
declare module '../state/CartContext' {
  export function useCart(): {
    cart: any[];
    restaurant: string | null;
    total: number;
    isOpen: boolean;
    isSubmitting: boolean;
    itemCount: number;
    addToCart: (item: any, restaurant?: string) => void;
    removeFromCart: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    submitOrder: (deliveryInfo: any) => Promise<any>;
    setIsOpen: (open: boolean) => void;
    syncCart: (items: any[], restaurant: string) => void;
  };
  export const CartProvider: React.ComponentType<{ children: React.ReactNode }>;
}

declare module '../components/Cart' {
  const Cart: React.ComponentType<any>;
  export default Cart;
}
declare module '../components/Cart.jsx' {
  const Cart: React.ComponentType<any>;
  export default Cart;
}

// MenuDrawer
declare module '../ui/MenuDrawer' {
  const MenuDrawer: React.ComponentType<any>;
  export default MenuDrawer;
}
declare module '../ui/MenuDrawer.jsx' {
  const MenuDrawer: React.ComponentType<any>;
  export default MenuDrawer;
}

// useSpeechRecognition hook
declare module '../hooks/useSpeechRecognition' {
  interface UseSpeechRecognitionOptions {
    onTranscriptChange?: (transcript: string) => void;
  }
  interface UseSpeechRecognitionReturn {
    recording: boolean;
    interimText: string;
    finalText: string;
    setFinalText: (text: string) => void;
    startRecording: () => void;
    stopRecording: () => void;
  }
  export function useSpeechRecognition(options?: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn;
}
declare module '../hooks/useSpeechRecognition.js' {
  interface UseSpeechRecognitionOptions {
    onTranscriptChange?: (transcript: string) => void;
  }
  interface UseSpeechRecognitionReturn {
    recording: boolean;
    interimText: string;
    finalText: string;
    setFinalText: (text: string) => void;
    startRecording: () => void;
    stopRecording: () => void;
  }
  export function useSpeechRecognition(options?: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn;
}

// VoiceStateManager
declare module '../managers/VoiceStateManager' {
  export type VoiceState = 'IDLE' | 'USER_SPEAKING' | 'PROCESSING' | 'SYSTEM_SPEAKING';
  export interface VoiceStateManager {
    getState(): VoiceState;
    setState(newState: VoiceState): void;
    onVadStart(): boolean;
    onVadEnd(): void;
    onTtsStart(turnId: string): void;
    onTtsEnd(): void;
    registerAudio(audio: HTMLAudioElement): void;
    stopTTS(): void;
    subscribe(callback: (state: VoiceState) => void): () => void;
  }
  export const voiceStateManager: VoiceStateManager;
}
declare module '../managers/VoiceStateManager.js' {
  export type VoiceState = 'IDLE' | 'USER_SPEAKING' | 'PROCESSING' | 'SYSTEM_SPEAKING';
  export interface VoiceStateManager {
    getState(): VoiceState;
    setState(newState: VoiceState): void;
    onVadStart(): boolean;
    onVadEnd(): void;
    onTtsStart(turnId: string): void;
    onTtsEnd(): void;
    registerAudio(audio: HTMLAudioElement): void;
    stopTTS(): void;
    subscribe(callback: (state: VoiceState) => void): () => void;
  }
  export const voiceStateManager: VoiceStateManager;
}
