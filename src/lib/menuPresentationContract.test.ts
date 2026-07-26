import { describe, expect, it } from 'vitest';
import { resolveMenuPresentationMode } from './menuPresentationContract';

describe('resolveMenuPresentationMode', () => {
    it('honors the explicit backend contract', () => {
        expect(resolveMenuPresentationMode({
            meta: { menuPresentationMode: 'discovery' },
        })).toBe('discovery');
        expect(resolveMenuPresentationMode({
            meta: { menuPresentationMode: 'full', focusedMenuItemId: 'dish-1' },
        })).toBe('full');
    });

    it('uses discovery for grounded searches and structured dish focus', () => {
        expect(resolveMenuPresentationMode({
            intent: 'search_menu_items',
        })).toBe('discovery');
        expect(resolveMenuPresentationMode({
            meta: { focusedMenuItemId: 'dish-1' },
        })).toBe('discovery');
    });

    it('defaults legacy menu responses to the full menu', () => {
        expect(resolveMenuPresentationMode({
            intent: 'menu_request',
            menu: [{ id: 'dish-1' }],
        })).toBe('full');
    });
});
