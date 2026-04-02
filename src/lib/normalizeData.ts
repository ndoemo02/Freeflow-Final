import { repairMojibakeText } from './textSanitizer';

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
    }));
};

export const normalizeRestaurants = (items: any[] | null | undefined): any[] | null => {
    if (!Array.isArray(items)) return null;
    return items.filter(Boolean).map((item, index) => ({
        ...item,
        id: item.id || `restaurant-${index}`,
        name: repairMojibakeText(item.display_name || item.name || 'Restauracja'),
        cuisine_type: repairMojibakeText(item.cuisine_type || item.category || item.city || 'Restauracja'),
        city: repairMojibakeText(item.city || item.address || ''),
    }));
};
