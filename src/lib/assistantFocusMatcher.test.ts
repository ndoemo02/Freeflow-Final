import { describe, expect, it } from 'vitest';
import {
    extractMentionedRestaurantIdsInOrder,
    findMentionedMenuItemId,
    findMentionedRestaurantId,
    findLastMentionedMenuItemId,
    isCartConfirmationText,
} from './assistantFocusMatcher';

const restaurants = [
    { id: 'a', name: 'Callzone' },
    { id: 'b', name: 'Klaps Burgers' },
    { id: 'c', name: 'Dwor Hubertus' },
];

const menuItems = [
    { id: 'm1', name: 'Bacon Burger' },
    { id: 'm2', name: 'Pizza Hawajska 33cm' },
    { id: 'm3', name: 'Krem pomidorowy' },
];

describe('assistantFocusMatcher', () => {
    it('matches restaurant names in assistant text', () => {
        expect(findMentionedRestaurantId('Na poczatek pokazalbym Klaps Burgers.', restaurants)).toBe('b');
    });

    it('matches restaurant option labels A/B/C to list order', () => {
        expect(findMentionedRestaurantId('Miejsce B bedzie najlepsze na burgery.', restaurants)).toBe('b');
        expect(findMentionedRestaurantId('Opcja C jest najblizej.', restaurants)).toBe('c');
    });

    it('extracts restaurants in the order Amber mentions them', () => {
        expect(extractMentionedRestaurantIdsInOrder('A: Callzone. B: Klaps Burgers. C: Dwor Hubertus.', restaurants)).toEqual(['a', 'b', 'c']);
    });

    it('matches menu items even when Amber omits size suffixes', () => {
        expect(findMentionedMenuItemId('Wez Pizza Hawajska, jest lekka.', menuItems)).toBe('m2');
    });

    it('prefers the strongest dish match over generic category words', () => {
        expect(findMentionedMenuItemId('Bacon Burger pasuje najlepiej.', menuItems)).toBe('m1');
    });

    it('recognizes add-to-cart confirmations as non-recommendation text', () => {
        expect(isCartConfirmationText('Dodałem Bacon Burger do koszyka.')).toBe(true);
        expect(isCartConfirmationText('Polecam Bacon Burger jako najlepszy wybór.')).toBe(false);
    });

    it('returns the latest dish mention from a growing transcript buffer', () => {
        expect(findLastMentionedMenuItemId('Najpierw Bacon Burger, a teraz Krem pomidorowy.', menuItems)).toBe('m3');
    });
});
