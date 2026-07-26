import { describe, expect, it } from 'vitest';

import { getMenuItemUiId } from './menuFocusContract';

describe('getMenuItemUiId', () => {
    it('keeps rendered rows unique even when backend item IDs repeat', () => {
        const first = getMenuItemUiId({ id: 'shared-id', name: 'Mała' }, 0);
        const second = getMenuItemUiId({ id: 'shared-id', name: 'Duża' }, 1);

        expect(first).toBe('0__shared-id');
        expect(second).toBe('1__shared-id');
        expect(first).not.toBe(second);
    });
});
