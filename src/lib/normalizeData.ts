import { repairMojibakeText } from './textSanitizer';

function parsePhotoGallery(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
                }
            } catch {
                // fall through to delimiter split
            }
        }
        return trimmed.split(/[;,]/).map((entry) => entry.trim()).filter(Boolean);
    }
    return [];
}

export const normalizeMenuItems = (items: any[] | null | undefined): any[] | null => {
    if (!Array.isArray(items)) return null;
    return items.filter(Boolean).map((item, index) => ({
        ...item,
        id: item.id || item.menuItemId || item.menu_item_id || `menu-${index}`,
        name: repairMojibakeText(item.name || item.base_name || item.title || 'Pozycja menu'),
        description: repairMojibakeText(item.description || item.desc || item.ingredients || ''),
        category: item.category || item.section || item.cuisine_type || null,
        price: Number(item.price ?? item.price_pln ?? item.pricePln ?? 0),
        price_pln: Number(item.price_pln ?? item.price ?? item.pricePln ?? 0),
        available: item.available !== false,
        spicy: item.spicy ?? false,
        is_vege: item.is_vege ?? false,
        item_tags: Array.isArray(item.item_tags) ? item.item_tags : [],
        dietary_flags: Array.isArray(item.dietary_flags) ? item.dietary_flags : [],
        section_order: Number(item.section_order ?? 0),
        safety_data: item.safety_data || null,
    }));
};

/**
 * Fix #5.5: Wymusza identyczną strukturę dla każdego przedmiotu w koszyku.
 * Backend cart items mają kontrakt: { id, name, price_pln, qty, restaurant_id, restaurant_name }
 * ale orderHandler tworzy je z kluczami { price, quantity } które są mapowane przez
 * commitPendingOrder. Ta funkcja jest defensywną normalizacją na wejściu do store —
 * gwarantuje że każdy item ma wymagane klucze, nawet jeśli przyszedł z niestandardowej ścieżki.
 */
export const normalizeCartItems = (cart: any): { items: any[]; total: number } | null => {
    if (!cart) return null;
    const items = Array.isArray(cart.items) ? cart.items : (Array.isArray(cart) ? cart : null);
    if (!Array.isArray(items)) return null;

    const normalizedItems = items
        .filter((item: any) => Boolean(item)) // odrzuć null/undefined wpisy
        .map((item: any, index: number) => ({
            id: String(item.id || item.menu_item_id || item.menuItemId || `cart-${index}`),
            name: String(item.name || item.item_name || item.base_name || `Pozycja ${index + 1}`),
            price_pln: Number(item.price_pln ?? item.price ?? 0),
            price: Number(item.price ?? item.price_pln ?? 0),
            qty: Number(item.qty ?? item.quantity ?? 1),
            quantity: Number(item.quantity ?? item.qty ?? 1),
            restaurant_id: item.restaurant_id || item.restaurantId || null,
            restaurant_name: item.restaurant_name || item.restaurantName || null,
            // Fix #6.3: taxonomy tags for item identity
            item_tags: Array.isArray(item.item_tags) ? item.item_tags : [],
            category: item.category || null,
            special_instructions: item.special_instructions || null,
            safety_data: item.safety_data || null,
            image_url: item.image_url || null,
            spicy: item.spicy ?? false,
            is_vege: item.is_vege ?? false,
            dietary_flags: Array.isArray(item.dietary_flags) ? item.dietary_flags : [],
            description: item.description || null,
        }));

    const total = normalizedItems.reduce((sum: number, item: any) => sum + (item.price_pln * item.qty), 0);

    return { items: normalizedItems, total: Number(total.toFixed(2)) };
};

export const normalizeRestaurants = (items: any[] | null | undefined): any[] | null => {
    if (!Array.isArray(items)) return null;
    return items.filter(Boolean).map((item, index) => {
        const rating = item.maps_rating || item.rating || 4.5;
        const ratingsCount = item.maps_ratings_total || 0;
        
        return {
            ...item,
            id: item.id || `restaurant-${index}`,
            name: repairMojibakeText(item.display_name || item.name || 'Restauracja'),
            cuisine_type: repairMojibakeText(item.cuisine_type || item.category || item.city || 'Restauracja'),
            city: repairMojibakeText(item.city || item.address || ''),
            rating: Number(rating),
            ratings_total: ratingsCount,
            phone: item.phone || null,
            website: item.website || null,
            opening_hours: item.opening_hours || null,
            maps_url: item.maps_url || null,
            image_url: item.image_url || null,
            img: item.img || item.image_url || null,
            photo_gallery: parsePhotoGallery(item.photo_gallery),
        };
    });
};
