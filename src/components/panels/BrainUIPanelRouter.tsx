import React from 'react';
import { UIHints } from '../../types/uiHints';
import RestaurantsList from './RestaurantsList';
import MenuPanel from './MenuPanel';
import KitchenDisplay from './KitchenDisplay';

interface BrainUIPanelRouterProps {
    uiHints: UIHints;
    data: any; // Raw brain response data
}

export default function BrainUIPanelRouter({ uiHints, data }: BrainUIPanelRouterProps) {
    // console.log("🧭 BrainUIPanelRouter", { uiHints, data });

    switch (uiHints.panel) {
        case 'restaurants':
            return <RestaurantsList data={data.restaurants || []} />;

        case 'menu':
            return <MenuPanel data={data.menuItems || []} restaurantName={data.currentRestaurant?.name} />;

        case 'kds':
            // Expecting KDS data in generic 'data' or specific field if passed
            return <KitchenDisplay data={data} />;

        case 'none':
        default:
            return null;
    }
}
