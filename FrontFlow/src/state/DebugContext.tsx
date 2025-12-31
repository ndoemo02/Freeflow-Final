import { create } from 'zustand';

interface TileDebugState {
    pos: [number, number, number];
    scale: number;
    rot: [number, number, number];
}

interface DebugState {
    // Global Light
    lightIntensity: number;
    lightPosX: number;
    lightPosY: number;
    lightPosZ: number;
    ambientIntensity: number;

    // Animation
    floatIntensity: number;

    // Individual Tiles
    food: TileDebugState;
    transport: TileDebugState;
    hotel: TileDebugState;

    // Actions
    setLightIntensity: (v: number) => void;
    setLightPosX: (v: number) => void;
    setLightPosY: (v: number) => void;
    setLightPosZ: (v: number) => void;
    setAmbientIntensity: (v: number) => void;

    setFloatIntensity: (v: number) => void;

    setTileProp: (tile: 'food' | 'transport' | 'hotel', prop: 'pos' | 'rot', axis: 0 | 1 | 2, val: number) => void;
    setTileScale: (tile: 'food' | 'transport' | 'hotel', val: number) => void;

    resetDebug: () => void;
}

const defaultTileState: TileDebugState = { pos: [0, 0, 0], scale: 1, rot: [0, 0, 0] };

export const useDebugControls = create<DebugState>((set) => ({
    lightIntensity: 0.5,
    lightPosX: -10,
    lightPosY: 5,
    lightPosZ: -10,
    ambientIntensity: 0.6,
    floatIntensity: 0,

    // Permanent positions based on user export
    food: { ...defaultTileState, pos: [-2.9, -1.5, 0], scale: 0.3, rot: [-0.14, -3.14, 0.06] },
    transport: { ...defaultTileState, pos: [0, -1.7, 0.8], scale: 49.6, rot: [0.16, -2.64, 0.06] },
    hotel: { ...defaultTileState, pos: [2.1, -1.3, 1.4], scale: 285.1, rot: [-0.04, -0.64, 0.06] },

    setLightIntensity: (v) => set({ lightIntensity: v }),
    setLightPosX: (v) => set({ lightPosX: v }),
    setLightPosY: (v) => set({ lightPosY: v }),
    setLightPosZ: (v) => set({ lightPosZ: v }),
    setAmbientIntensity: (v) => set({ ambientIntensity: v }),
    setFloatIntensity: (v) => set({ floatIntensity: v }),

    setTileProp: (tile, prop, axis, val) => set((state) => {
        const newProp = [...state[tile][prop]] as [number, number, number];
        newProp[axis] = val;
        return { [tile]: { ...state[tile], [prop]: newProp } };
    }),

    setTileScale: (tile, val) => set((state) => ({
        [tile]: { ...state[tile], scale: val }
    })),

    resetDebug: () => set({
        lightIntensity: 0.5,
        lightPosX: -10,
        lightPosY: 5,
        lightPosZ: -10,
        ambientIntensity: 0.6,
        floatIntensity: 0,
        food: { ...defaultTileState, pos: [-2.9, -1.5, 0], scale: 0.3, rot: [-0.14, -3.14, 0.06] },
        transport: { ...defaultTileState, pos: [0, -1.7, 0.8], scale: 49.6, rot: [0.16, -2.64, 0.06] },
        hotel: { ...defaultTileState, pos: [2.1, -1.3, 1.4], scale: 285.1, rot: [-0.04, -0.64, 0.06] },
    })
}));
