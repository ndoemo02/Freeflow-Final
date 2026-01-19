import React from 'react';
import { UIHints } from '../types/uiHints';
import RestaurantsList from './panels/RestaurantsList';
import MenuPanel from './panels/MenuPanel';
import KitchenDisplay from './panels/KitchenDisplay';
import BusinessStatsPanel from './panels/BusinessStatsPanel';

interface UIPanelRouterProps {
    uiHints: UIHints;
    data: any; // Raw brain response data
}

export default function UIPanelRouter({ uiHints, data }: UIPanelRouterProps) {
    // console.log("🧭 UIPanelRouter", { uiHints, data });

    switch (uiHints.panel) {
        case 'restaurants':
            return <RestaurantsList data={data.restaurants || []} />;

        case 'menu':
            // Pass restaurantName if available in data
            const restaurantName = data.currentRestaurant?.name || data.restaurantName;
            return <MenuPanel data={data.menuItems || []} restaurantName={restaurantName} />;

        case 'kds':
            // Expecting KDS data in generic 'data' or specific field if passed
            return <KitchenDisplay data={data} />;

        case 'business':
            return <BusinessStatsPanel data={data} />;

        case 'none':
        default:
            // "If none -> render EmptyState"
            // In Home.tsx, the empty state (Logo) is rendered when uiHints.panel === 'none'.
            // Returning null here allows Home to handle the default background/logo view.
            return null;
    }
}
