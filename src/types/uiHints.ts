export type PanelType = 'restaurants' | 'menu' | 'kds' | 'business' | 'none';

export interface UIHints {
    panel: PanelType;
    context?: any;
}
