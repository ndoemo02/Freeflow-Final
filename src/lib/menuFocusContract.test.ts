import { describe, expect, it } from 'vitest';
import {
    getMenuItemStableId,
    hasValidStructuredMenuFocus,
    resolveStructuredFocusedMenuItemId,
} from './menuFocusContract';

describe('menuFocusContract', () => {
    const items = [
        { id: 'id-1', name: 'Bacon Burger' },
        { menuItemId: 'menu-item-2', name: 'Pierogi' },
        { menu_item_id: 'menu_item_3', name: 'Zupa' },
    ];

    it('reads stable ids from supported menu item id fields', () => {
        expect(getMenuItemStableId({ id: 'a' })).toBe('a');
        expect(getMenuItemStableId({ menuItemId: 'b' })).toBe('b');
        expect(getMenuItemStableId({ menu_item_id: 'c' })).toBe('c');
    });

    it('resolves a valid focusedMenuItemId from id', () => {
        expect(resolveStructuredFocusedMenuItemId({ meta: { focusedMenuItemId: 'id-1' } }, items)).toBe('id-1');
    });

    it('resolves a valid focusedMenuItemId from menuItemId', () => {
        expect(resolveStructuredFocusedMenuItemId({ meta: { focusedMenuItemId: 'menu-item-2' } }, items)).toBe('menu-item-2');
    });

    it('resolves a valid focusedMenuItemId from menu_item_id', () => {
        expect(resolveStructuredFocusedMenuItemId({ meta: { focusedMenuItemId: 'menu_item_3' } }, items)).toBe('menu_item_3');
    });

    it('returns null for an invalid focusedMenuItemId so fallback behavior can continue', () => {
        expect(resolveStructuredFocusedMenuItemId({ meta: { focusedMenuItemId: 'missing' } }, items)).toBeNull();
        expect(hasValidStructuredMenuFocus({ meta: { focusedMenuItemId: 'missing' } }, items)).toBe(false);
    });

    it('reports valid structured focus so assistant text parsing can stay fallback-only', () => {
        expect(hasValidStructuredMenuFocus({ meta: { focusedMenuItemId: 'menu-item-2' } }, items)).toBe(true);
    });
});
