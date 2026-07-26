export type MenuPresentationMode = 'discovery' | 'full';

function readToolName(response: any): string {
    return String(
        response?.meta?.liveTool?.toolName
        || response?.meta?.tool
        || response?.tool
        || '',
    ).trim();
}
/**
 * Resolves the menu surface from structured backend data only.
 * Assistant prose must never control layout.
 */
export function resolveMenuPresentationMode(response: any): MenuPresentationMode {
    const explicit = response?.meta?.menuPresentationMode;
    if (explicit === 'discovery' || explicit === 'full') {
        return explicit;
    }

    const intent = String(response?.intent || '').trim();
    const toolName = readToolName(response);
    const hasStructuredFocus = Boolean(response?.meta?.focusedMenuItemId);

    if (intent === 'search_menu_items' || toolName === 'search_menu_items') {
        return 'discovery';
    }

    if (hasStructuredFocus) {
        return 'discovery';
    }

    return 'full';
}
