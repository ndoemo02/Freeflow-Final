import { getApiUrl } from './config';

// -- Interfaces based on API Reference --

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    description: string;
    available: boolean;
    category: string;
}

export interface MenuResponse {
    ok: boolean;
    restaurant_id: string;
    restaurant_name: string;
    items: MenuItem[];
    count: number;
}

export interface StockItemStatus {
    ok: boolean;
    item_id: string;
    name: string;
    price: number;
    available: boolean;
}

// Handling potential response shapes for bulk requests
// optimizing for the possibility of a direct array or a wrapped object
export type StockCheckResponse = StockItemStatus | StockItemStatus[];

export interface OrderItemPayload {
    id: string;
    quantity: number;
    mods?: string[];
}

export interface OrderPayload {
    restaurant_id: string;
    items: OrderItemPayload[];
    table_id?: string;
    customer_name?: string;
    notes?: string;
}

export interface OrderItemResponse {
    id: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
}

export interface OrderResponse {
    ok: boolean;
    order_id: string;
    status: string;
    total: number;
    total_formatted: string;
    items_count: number;
    restaurant_name: string;
    items: OrderItemResponse[];
}

export interface AgentResponse {
    ok: boolean;
    message: {
        role: string;
        content: string | null;
        tool_calls?: any[];
    };
    history?: any[];
}

// -- API Functions --

/**
 * Fetch menu items for AI context.
 * GET /api/ai/tools/menu
 */
export async function fetchMenuForAI(restaurantId: string): Promise<MenuResponse> {
    try {
        const url = getApiUrl(`api/ai/tools/menu?restaurant_id=${restaurantId}&limit=50&include_unavailable=false`);
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to fetch menu: ${response.statusText}`);
        }

        return data as MenuResponse;
    } catch (error: any) {
        console.error('fetchMenuForAI Error:', error);
        throw new Error(error.message || 'Network error fetching menu');
    }
}

/**
 * Check stock availability for specific items.
 * GET /api/ai/tools/stock
 * Supports single or bulk check.
 */
export async function checkStockForAI(itemIds: string[]): Promise<StockCheckResponse> {
    try {
        if (itemIds.length === 0) {
            throw new Error("No item IDs provided for stock check");
        }

        const queryParam = itemIds.length === 1
            ? `item_id=${itemIds[0]}`
            : `items=${itemIds.join(',')}`;

        const url = getApiUrl(`api/ai/tools/stock?${queryParam}`);
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to check stock: ${response.statusText}`);
        }

        return data as StockCheckResponse;
    } catch (error: any) {
        console.error('checkStockForAI Error:', error);
        throw new Error(error.message || 'Network error checking stock');
    }
}

/**
 * Create a new order from Voice AI.
 * POST /api/ai/tools/order
 */
export async function createVoiceOrder(orderData: OrderPayload): Promise<OrderResponse> {
    try {
        const url = getApiUrl('api/ai/tools/order');
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Failed to create order: ${response.statusText}`);
        }

        return data as OrderResponse;
    } catch (error: any) {
        console.error('createVoiceOrder Error:', error);
        throw new Error(error.message || 'Network error creating order');
    }
}

/**
 * Talk to the AI Agent (Brain).
 * POST /api/ai/agent
 */
export async function talkToAgent(message: string, history: any[], restaurantId: string): Promise<AgentResponse> {
    try {
        const url = getApiUrl('api/ai/agent');

        // Inject context so the agent knows which restaurant we are talking about
        // This is crucial for get_menu() tool calls.
        const contextMessage = {
            role: "system",
            content: `Current Restaurant ID: ${restaurantId}`
        };

        // Prepare messages: Context + History + New Message
        const messages = [
            contextMessage,
            ...history,
            { role: "user", content: message }
        ];

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Agent error: ${response.statusText}`);
        }

        return data as AgentResponse;
    } catch (error: any) {
        console.error('talkToAgent Error:', error);
        throw new Error(error.message || 'Network error talking to agent');
    }
}
