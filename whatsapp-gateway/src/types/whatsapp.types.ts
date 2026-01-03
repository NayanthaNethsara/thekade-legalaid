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

export interface Interactive {
  type: 'button' | 'list';
  body: {
    text: string;
  };
  action: {
    buttons?: Array<{
      type: 'reply';
      reply: {
        id: string;
        title: string;
      };
    }>;
    button?: string;
    sections?: Array<{
      title?: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  };
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
