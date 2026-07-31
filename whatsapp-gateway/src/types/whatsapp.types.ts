// Wire-format types for the WhatsApp Cloud API /messages endpoint.
// These mirror the request shapes documented at
// https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/send-messages/

/** Media referenced by a pre-uploaded id or a public link. */
export interface MediaObject {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
}

export interface TemplateComponent {
  type: string;
  parameters: Array<{
    type: string;
    text?: string;
    image?: { link: string };
    video?: { link: string };
    document?: { link: string };
  }>;
}

export interface Template {
  name: string;
  language: string;
  components?: TemplateComponent[];
}

export interface InteractiveHeader {
  type: 'text' | 'image' | 'video' | 'document';
  text?: string;
  image?: MediaObject;
  video?: MediaObject;
  document?: MediaObject;
}

export interface ReplyButton {
  type: 'reply';
  reply: {
    id: string;
    title: string;
  };
}

export interface ListSection {
  title?: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export interface CtaUrlParameters {
  display_text: string;
  url: string;
}

/**
 * One card of an interactive media carousel. Requires Graph API v23.0+.
 * Cards are either CTA URL cards or quick-reply cards; all cards in one
 * carousel must use the same type.
 */
export interface CarouselCard {
  card_index: number;
  type: 'cta_url' | 'quick_reply';
  header: InteractiveHeader;
  body?: { text: string };
  footer?: { text: string };
  action: {
    name?: 'cta_url';
    parameters?: CtaUrlParameters;
    buttons?: ReplyButton[];
  };
}

/** Parameters of a Flow message action (WhatsApp Flows). */
export interface FlowParameters {
  flow_message_version: string;
  flow_cta: string;
  flow_token?: string;
  flow_id?: string;
  flow_name?: string;
  flow_action?: 'navigate' | 'data_exchange';
  flow_action_payload?: {
    screen: string;
    data?: Record<string, unknown>;
  };
  mode?: 'draft' | 'published';
}

/** Parameters of an address request message action. */
export interface AddressParameters {
  country: string;
  values?: Record<string, unknown>;
  saved_addresses?: Array<{
    id: string;
    value: Record<string, unknown>;
  }>;
}

export interface Interactive {
  type:
    | 'button'
    | 'list'
    | 'cta_url'
    | 'location_request_message'
    | 'carousel'
    | 'address_message'
    | 'flow'
    | 'call_permission_request';
  header?: InteractiveHeader;
  body?: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: {
    buttons?: ReplyButton[];
    button?: string;
    sections?: ListSection[];
    name?:
      | 'cta_url'
      | 'send_location'
      | 'address_message'
      | 'flow'
      | 'call_permission_request';
    parameters?: CtaUrlParameters | FlowParameters | AddressParameters;
    cards?: CarouselCard[];
  };
}

export interface LocationObject {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/** Contact card, per the Cloud API contacts message schema. */
export interface ContactObject {
  name: {
    formatted_name: string;
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    prefix?: string;
    suffix?: string;
  };
  phones?: Array<{ phone: string; type?: string; wa_id?: string }>;
  emails?: Array<{ email: string; type?: string }>;
  urls?: Array<{ url: string; type?: string }>;
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    country_code?: string;
    type?: string;
  }>;
  org?: { company?: string; department?: string; title?: string };
  birthday?: string;
}

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
}

export interface WhatsAppApiError {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}
