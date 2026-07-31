export interface ProductCard {
  code: string;
  name: string;
  price?: string | null;
  stock?: string | null;
  image_url?: string | null;
  url?: string | null;
}

export interface ChatAction {
  kind: "pay" | "track";
  label: string;
  url: string;
}

/**
 * One step the agent took while answering a turn (a search it ran, a tool it
 * called), surfaced as inline chips and in the side results panel.
 */
export interface TrackingStep {
  step: string;
  timestamp: string;
}

export interface TrackingItem {
  product_id: string;
  name: string;
  quantity: number;
  selling_price: number;
}

export interface TrackingData {
  order_number: string;
  pnref?: string;
  status: string;
  status_display: string;
  order_date?: string;
  delivery_date?: string;
  shipped_date?: string | null;
  amount?:
    | {
        value: string;
        currency: string;
      }
    | string;
  payment_method?: string;
  comments?: string | null;
  recipient?: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  greeting_message?: string | null;
  special_instructions?: string | null;
  progress?: TrackingStep[];
  live_tracking_available?: boolean;
  has_delivery_video?: boolean;
  has_delivery_photo?: boolean;
  items?: TrackingItem[];
}

export interface SearchStep {
  id: string;
  label: string;
  query?: string;
  resultCount?: number;
  status: "running" | "done";
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  cards?: ProductCard[];
  actions?: ChatAction[];
  images?: string[];
  steps?: SearchStep[];
  tracking?: TrackingData[];
}

export type ChatResult =
  | {
      ok: true;
      reply: string;
      cards: ProductCard[];
      actions: ChatAction[];
      tracking?: TrackingData[];
    }
  | { ok: false; error: string };

export interface ChatApiResponse {
  reply: string;
  cards?: ProductCard[];
  actions?: ChatAction[];
  tracking?: TrackingData[];
}

export interface MessageHistory {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: ProductCard[];
  actions?: ChatAction[];
  tracking?: TrackingData[];
}

export interface ConversationSummary {
  id: string;
  title: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  summary: string;
  messages: MessageHistory[];
}

export interface QuickMessageItem {
  iconName: string;
  label: string;
  message: string;
}
