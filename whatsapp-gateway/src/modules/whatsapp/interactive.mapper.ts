import {
  Interactive,
  InteractiveHeader,
  MediaObject,
  CarouselCard,
  ContactObject,
} from '../../types/whatsapp.types';
import {
  OutgoingInteractiveContent,
  OutgoingInteractiveHeader,
  OutgoingCarouselCard,
  OutgoingContactCard,
} from '../nats/dto/nats-message.dto';

function toMediaObject(mediaUrl?: string, mediaId?: string): MediaObject {
  return mediaUrl ? { link: mediaUrl } : { id: mediaId };
}

function toWireHeader(header: OutgoingInteractiveHeader): InteractiveHeader {
  if (header.type === 'text') {
    return { type: 'text', text: header.text };
  }
  return {
    type: header.type,
    [header.type]: toMediaObject(header.mediaUrl, header.mediaId),
  };
}

function toWireCard(
  card: OutgoingCarouselCard,
  cardIndex: number,
): CarouselCard {
  return {
    card_index: cardIndex,
    type: card.ctaUrl ? 'cta_url' : 'quick_reply',
    header: toWireHeader(card.header),
    ...(card.body && { body: card.body }),
    ...(card.footer && { footer: card.footer }),
    action: card.ctaUrl
      ? {
          name: 'cta_url' as const,
          parameters: {
            display_text: card.ctaUrl.displayText,
            url: card.ctaUrl.url,
          },
        }
      : { buttons: card.buttons ?? [] },
  };
}

/** Map the queue-facing interactive content to the Cloud API wire shape. */
export function toWireInteractive(
  content: OutgoingInteractiveContent,
): Interactive {
  switch (content.type) {
    case 'button':
      return {
        type: 'button',
        ...(content.header && { header: toWireHeader(content.header) }),
        body: content.body,
        ...(content.footer && { footer: content.footer }),
        action: { buttons: content.action.buttons },
      };

    case 'list':
      return {
        type: 'list',
        ...(content.header && { header: toWireHeader(content.header) }),
        body: content.body,
        ...(content.footer && { footer: content.footer }),
        action: {
          button: content.action.button,
          sections: content.action.sections,
        },
      };

    case 'cta_url':
      return {
        type: 'cta_url',
        ...(content.header && { header: toWireHeader(content.header) }),
        body: content.body,
        ...(content.footer && { footer: content.footer }),
        action: {
          name: 'cta_url',
          parameters: {
            display_text: content.action.displayText,
            url: content.action.url,
          },
        },
      };

    case 'location_request_message':
      return {
        type: 'location_request_message',
        body: content.body,
        action: { name: 'send_location' },
      };

    case 'carousel':
      return {
        type: 'carousel',
        body: content.body,
        action: { cards: content.cards.map(toWireCard) },
      };

    case 'address_message':
      return {
        type: 'address_message',
        body: content.body,
        ...(content.footer && { footer: content.footer }),
        action: {
          name: 'address_message',
          parameters: {
            country: content.action.country,
            ...(content.action.values && { values: content.action.values }),
            ...(content.action.savedAddresses && {
              saved_addresses: content.action.savedAddresses,
            }),
          },
        },
      };

    case 'flow':
      return {
        type: 'flow',
        ...(content.header && { header: toWireHeader(content.header) }),
        body: content.body,
        ...(content.footer && { footer: content.footer }),
        action: {
          name: 'flow',
          parameters: {
            flow_message_version: '3',
            flow_cta: content.action.cta,
            flow_token: content.action.flowToken ?? 'unused',
            ...(content.action.flowId && { flow_id: content.action.flowId }),
            ...(content.action.flowName && {
              flow_name: content.action.flowName,
            }),
            flow_action: content.action.flowAction ?? 'navigate',
            ...(content.action.screen && {
              flow_action_payload: {
                screen: content.action.screen,
                ...(content.action.data && { data: content.action.data }),
              },
            }),
            ...(content.action.mode && { mode: content.action.mode }),
          },
        },
      };

    case 'call_permission_request':
      return {
        type: 'call_permission_request',
        body: content.body,
        action: { name: 'call_permission_request' },
      };
  }
}

/** Map a queue-facing contact card to the Cloud API wire shape. */
export function toWireContact(contact: OutgoingContactCard): ContactObject {
  return {
    name: {
      formatted_name: contact.name.formattedName,
      ...(contact.name.firstName && { first_name: contact.name.firstName }),
      ...(contact.name.lastName && { last_name: contact.name.lastName }),
    },
    ...(contact.phones && {
      phones: contact.phones.map(({ phone, type, waId }) => ({
        phone,
        ...(type && { type }),
        ...(waId && { wa_id: waId }),
      })),
    }),
    ...(contact.emails && { emails: contact.emails }),
    ...(contact.urls && { urls: contact.urls }),
    ...(contact.org && { org: contact.org }),
  };
}
