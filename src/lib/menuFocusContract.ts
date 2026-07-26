export function getMenuItemStableId(item: any): string | null {
    const id = item?.id ?? item?.menuItemId ?? item?.menu_item_id ?? null;
    if (id == null) return null;
    const value = String(id);
    return value ? value : null;
}

export function getMenuItemUiId(item: any, index: number): string {
    const stableId = getMenuItemStableId(item)
        ?? String(item?.name ?? item?.base_name ?? 'item');
    return `${index}__${stableId}`;
}

export function resolveStructuredFocusedMenuItemId(response: any, items: any[]): string | null {
    if (!Array.isArray(items) || items.length === 0) return null;

    const focusedId = response?.meta?.focusedMenuItemId;
    if (focusedId == null) return null;

    const id = String(focusedId);
    if (!id) return null;

    return items.some((item) => getMenuItemStableId(item) === id) ? id : null;
}

export function hasValidStructuredMenuFocus(response: any, items: any[]): boolean {
    return resolveStructuredFocusedMenuItemId(response, items) != null;
}
