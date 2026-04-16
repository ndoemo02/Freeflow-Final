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
        spicy: item.spicy ?? false,
        is_vege: item.is_vege ?? false,
        item_tags: Array.isArray(item.item_tags) ? item.item_tags : [],
        dietary_flags: Array.isArray(item.dietary_flags) ? item.dietary_flags : [],
        section_order: Number(item.section_order ?? 0),
    }));
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
            photo_gallery: Array.isArray(item.photo_gallery) ? item.photo_gallery : [],
        };
    });
};
