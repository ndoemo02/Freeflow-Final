import React from 'react';
import { UIHints } from '../types/uiHints';
import KitchenDisplay from './panels/KitchenDisplay';
import BusinessStatsPanel from './panels/BusinessStatsPanel';

interface UIPanelRouterProps {
    uiHints: UIHints;
    data: any; // Raw brain response data
}

export default function UIPanelRouter({ uiHints, data }: UIPanelRouterProps) {

    switch (uiHints.panel) {
        case 'restaurants':
            // W nowym UI-only V2, karuzela restauracji jest obsługiwana przez ulepszony SuggestedRestaurantsCarousel
            return null;

        case 'menu':
            // Menu jest teraz renderowane przez MenuIsland (prawa strefa fixed).
            // Nie renderuj centralnego overlaya — return null.
            return null;

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
