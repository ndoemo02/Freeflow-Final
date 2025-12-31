import React, { useState, useEffect, useRef } from 'react';
import { logger } from '../lib/logger';
import { useUI } from '../state/ui';
import { useDebugControls } from '../state/DebugContext';

export default function DebugPanel() {
    const [isOpen, setIsOpen] = useState(true); // Open by default for visibility
    const [activeTab, setActiveTab] = useState<'controls' | 'logs' | 'state' | 'export'>('controls'); // Default context relevant
    const [logs, setLogs] = useState(logger.getHistory());

    // Draggable State
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    // State from stores
    const uiState = useUI();
    const debug = useDebugControls();

    // Log Subscription
    useEffect(() => {
        const unsub = logger.subscribe((entry) => {
            setLogs((prev) => [entry, ...prev].slice(0, 500));
        });
        return unsub;
    }, []);

    // Global Mouse Handlers for Drag
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging.current) {
                setPosition({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
            }
        };
        const handleMouseUp = () => {
            isDragging.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startDrag = (e: React.MouseEvent) => {
        isDragging.current = true;
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    background: '#000',
                    color: '#00ffc8',
                    border: '2px solid #00ffc8',
                    zIndex: 9999,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px #00ffc8'
                }}
                title="Open Debug Panel"
            >
                🛠️ DEBUG 3D
            </button>
        );
    }

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                top: position.y,
                left: position.x,
                width: '450px',
                height: '600px',
                background: 'rgba(10, 10, 10, 0.95)',
                border: '1px solid #333',
                borderRadius: '8px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                color: '#eee',
                fontFamily: 'monospace',
                boxShadow: '0 0 30px rgba(0,0,0,0.8)'
            }}
        >
            {/* Header (Drag Handle) */}
            <div
                onMouseDown={startDrag}
                style={{
                    padding: '10px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#1a1a1a',
                    cursor: 'move',
                    userSelect: 'none'
                }}
            >
                <div style={{ fontWeight: 'bold', color: '#00ffc8' }}>DEBUG CLI v1.1</div>
                <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setIsOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px' }}
                >
                    ✖
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
                <TabButton active={activeTab === 'controls'} onClick={() => setActiveTab('controls')}>Scene</TabButton>
                <TabButton active={activeTab === 'export'} onClick={() => setActiveTab('export')}>Export</TabButton>
                <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>Logs</TabButton>
                <TabButton active={activeTab === 'state'} onClick={() => setActiveTab('state')}>State</TabButton>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '15px' }}>

                {activeTab === 'export' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '5px' }}>
                            Copy these values to update <b>src/state/DebugContext.tsx</b>:
                        </div>
                        <pre style={{
                            fontSize: '11px',
                            color: '#00ffc8',
                            background: '#111',
                            padding: '10px',
                            borderRadius: '5px',
                            border: '1px solid #333',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            userSelect: 'all'
                        }}>
                            {`  // Updated Defaults
  lightIntensity: ${debug.lightIntensity},
  lightPosX: ${debug.lightPosX},
  lightPosY: ${debug.lightPosY},
  lightPosZ: ${debug.lightPosZ},
  ambientIntensity: ${debug.ambientIntensity},
  floatIntensity: ${debug.floatIntensity},

  food: { ...defaultTileState, 
    pos: [${debug.food.pos.map(n => Math.round(n * 100) / 100).join(', ')}], 
    scale: ${debug.food.scale}, 
    rot: [${debug.food.rot.map(n => Math.round(n * 100) / 100).join(', ')}] 
  },
  transport: { ...defaultTileState, 
    pos: [${debug.transport.pos.map(n => Math.round(n * 100) / 100).join(', ')}], 
    scale: ${debug.transport.scale}, 
    rot: [${debug.transport.rot.map(n => Math.round(n * 100) / 100).join(', ')}] 
  },
  hotel: { ...defaultTileState, 
    pos: [${debug.hotel.pos.map(n => Math.round(n * 100) / 100).join(', ')}], 
    scale: ${debug.hotel.scale}, 
    rot: [${debug.hotel.rot.map(n => Math.round(n * 100) / 100).join(', ')}] 
  },`}
                        </pre>
                        <button
                            onClick={() => {
                                const text = `
  lightIntensity: ${debug.lightIntensity},
  lightPosX: ${debug.lightPosX},
  lightPosY: ${debug.lightPosY},
  lightPosZ: ${debug.lightPosZ},
  ambientIntensity: ${debug.ambientIntensity},
  floatIntensity: ${debug.floatIntensity},

  food: { ...defaultTileState, pos: [${debug.food.pos.map(n => Math.round(n * 100) / 100).join(', ')}], scale: ${debug.food.scale}, rot: [${debug.food.rot.map(n => Math.round(n * 100) / 100).join(', ')}] },
  transport: { ...defaultTileState, pos: [${debug.transport.pos.map(n => Math.round(n * 100) / 100).join(', ')}], scale: ${debug.transport.scale}, rot: [${debug.transport.rot.map(n => Math.round(n * 100) / 100).join(', ')}] },
  hotel: { ...defaultTileState, pos: [${debug.hotel.pos.map(n => Math.round(n * 100) / 100).join(', ')}], scale: ${debug.hotel.scale}, rot: [${debug.hotel.rot.map(n => Math.round(n * 100) / 100).join(', ')}] },
`;
                                navigator.clipboard.writeText(text);
                                alert('Copied to clipboard!');
                            }}
                            style={{ padding: '10px', background: '#00ffc8', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
                        >
                            Copy to Clipboard
                        </button>
                    </div>
                )}

                {activeTab === 'controls' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Lighting */}
                        <ControlGroup title="Global Lighting & Effects">
                            <Slider label="Intensity" value={debug.lightIntensity} min={0} max={20} step={0.5} onChange={debug.setLightIntensity} />
                            <Slider label="Ambient" value={debug.ambientIntensity} min={0} max={5} step={0.1} onChange={debug.setAmbientIntensity} />
                            <Slider label="Float Anim" value={debug.floatIntensity} min={0} max={5} step={0.1} onChange={debug.setFloatIntensity} />

                            <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>Position (X / Y / Z)</div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <SliderCompact label="X" value={debug.lightPosX} min={-20} max={20} step={1} onChange={debug.setLightPosX} />
                                <SliderCompact label="Y" value={debug.lightPosY} min={-20} max={20} step={1} onChange={debug.setLightPosY} />
                                <SliderCompact label="Z" value={debug.lightPosZ} min={-20} max={20} step={1} onChange={debug.setLightPosZ} />
                            </div>
                        </ControlGroup>

                        {/* FOOD */}
                        <TileControls
                            title="🍔 Food Tile"
                            data={debug.food}
                            onChangePos={(axis: number, v: number) => debug.setTileProp('food', 'pos', axis as 0 | 1 | 2, v)}
                            onChangeRot={(axis: number, v: number) => debug.setTileProp('food', 'rot', axis as 0 | 1 | 2, v)}
                            onChangeScale={(v: number) => debug.setTileScale('food', v)}
                        />

                        {/* TRANSPORT */}
                        <TileControls
                            title="🚕 Transport Tile"
                            data={debug.transport}
                            onChangePos={(axis: number, v: number) => debug.setTileProp('transport', 'pos', axis as 0 | 1 | 2, v)}
                            onChangeRot={(axis: number, v: number) => debug.setTileProp('transport', 'rot', axis as 0 | 1 | 2, v)}
                            onChangeScale={(v: number) => debug.setTileScale('transport', v)}
                        />

                        {/* HOTEL */}
                        <TileControls
                            title="🛏️ Hotel Tile"
                            data={debug.hotel}
                            onChangePos={(axis: number, v: number) => debug.setTileProp('hotel', 'pos', axis as 0 | 1 | 2, v)}
                            onChangeRot={(axis: number, v: number) => debug.setTileProp('hotel', 'rot', axis as 0 | 1 | 2, v)}
                            onChangeScale={(v: number) => debug.setTileScale('hotel', v)}
                        />

                        <button onClick={debug.resetDebug} style={{ padding: '10px', background: '#333', color: 'white', border: 'none', cursor: 'pointer' }}>Reset Defaults</button>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div style={{ fontSize: '12px' }}>
                        <button onClick={() => logger.clear()} style={{ marginBottom: '10px', padding: '5px', width: '100%', background: '#222', color: '#fff', border: '1px solid #444' }}>Clear</button>
                        {logs.map((log, i) => (
                            <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #222', paddingBottom: '2px' }}>
                                <span style={{ color: '#666' }}>[{log.timestamp.split('T')[1].split('.')[0]}]</span>{' '}
                                <span style={{
                                    color: log.level === 'error' ? '#ff5555' :
                                        log.level === 'warn' ? '#ffaa00' :
                                            log.level === 'info' ? '#55ffff' : '#888',
                                    fontWeight: 'bold'
                                }}>{log.level.toUpperCase()}</span>:{' '}
                                {log.message}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'state' && (
                    <pre style={{ fontSize: '11px', color: '#88ff88' }}>
                        {JSON.stringify({
                            mode: uiState.mode,
                            drawerOpen: uiState.drawerOpen,
                            highlighted: uiState.highlightedCardId,
                            presentationItems: uiState.presentationItems.length
                        }, null, 2)}
                    </pre>
                )}
            </div>
        </div>
    );
}

// Subcomponents
function TileControls({ title, data, onChangePos, onChangeRot, onChangeScale }: any) {
    return (
        <ControlGroup title={title}>
            <Slider label="Scale" value={data.scale} min={0.1} max={500} step={1} onChange={onChangeScale} />
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>Position (X / Y / Z)</div>
            <div style={{ display: 'flex', gap: '5px' }}>
                <SliderCompact label="X" value={data.pos[0]} min={-10} max={10} step={0.1} onChange={(v: number) => onChangePos(0, v)} />
                <SliderCompact label="Y" value={data.pos[1]} min={-10} max={10} step={0.1} onChange={(v: number) => onChangePos(1, v)} />
                <SliderCompact label="Z" value={data.pos[2]} min={-10} max={10} step={0.1} onChange={(v: number) => onChangePos(2, v)} />
            </div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#888' }}>Rotation (X / Y / Z)</div>
            <div style={{ display: 'flex', gap: '5px' }}>
                <SliderCompact label="X" value={data.rot[0]} min={-3.14} max={3.14} step={0.1} onChange={(v: number) => onChangeRot(0, v)} />
                <SliderCompact label="Y" value={data.rot[1]} min={-3.14} max={3.14} step={0.1} onChange={(v: number) => onChangeRot(1, v)} />
                <SliderCompact label="Z" value={data.rot[2]} min={-3.14} max={3.14} step={0.1} onChange={(v: number) => onChangeRot(2, v)} />
            </div>
        </ControlGroup>
    )
}

function TabButton({ active, onClick, children }: any) {
    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                padding: '10px',
                background: active ? '#222' : 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid #00ffc8' : '1px solid transparent',
                color: active ? '#fff' : '#888',
                cursor: 'pointer',
                fontWeight: active ? 'bold' : 'normal'
            }}
        >
            {children}
        </button>
    )
}

function ControlGroup({ title, children }: any) {
    return (
        <div style={{ border: '1px solid #333', padding: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ fontSize: '11px', color: '#00ffc8', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}>{title}</div>
            {children}
        </div>
    )
}

function Slider({ label, value, min, max, step, onChange }: any) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '80px', fontSize: '12px', color: '#ccc' }}>{label}</div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{ flex: 1, marginRight: '10px', accentColor: '#00ffc8' }}
            />
            <div style={{ width: '30px', fontSize: '11px', textAlign: 'right', color: '#00ffc8' }}>{Math.round(value * 10) / 10}</div>
        </div>
    )
}

function SliderCompact({ label, value, min, max, step, onChange }: any) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'rgba(0,0,0,0.2)', padding: '2px 5px', borderRadius: '4px' }}>
            <div style={{ fontSize: '10px', color: '#888', marginRight: '5px' }}>{label}</div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{ flex: 1, minWidth: '0', accentColor: '#00ffc8' }}
            />
        </div>
    )
}
