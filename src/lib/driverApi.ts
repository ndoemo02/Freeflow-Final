
// Mock API for Driver Panel
// In the future this will connect to the real /api/v1/demand-forecast endpoint

export interface DemandPoint {
    lat: number;
    lng: number;
    weight: number;
}

export interface DriverStats {
    todayEarnings: number;
    zoneBonus: number;
    acceptanceRate: number;
    trend: 'up' | 'down' | 'neutral';
}

export const fetchDemandForecast = async (): Promise<DemandPoint[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const center = { lat: 40.7128, lng: -74.0060 };
    const points: DemandPoint[] = [];

    // General ambient demand
    for (let i = 0; i < 50; i++) {
        const lat = center.lat + (Math.random() - 0.5) * 0.05;
        const lng = center.lng + (Math.random() - 0.5) * 0.05;
        points.push({
            lat,
            lng,
            weight: Math.random() * 5
        });
    }

    // High demand "Hot Zone" (e.g., Downtown / Events)
    // This logic mimics "Gemini calculated weight based on history & NLU"
    for (let i = 0; i < 25; i++) {
        const lat = center.lat + 0.01 + (Math.random() - 0.5) * 0.015;
        const lng = center.lng + 0.01 + (Math.random() - 0.5) * 0.015;
        points.push({
            lat,
            lng,
            weight: 10 + Math.random() * 10 // Higher weight for hot zones
        });
    }

    return points;
};

export const fetchDriverStats = async (): Promise<DriverStats> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
        todayEarnings: 145.50,
        zoneBonus: 15.00,
        acceptanceRate: 94,
        trend: 'up'
    };
};
