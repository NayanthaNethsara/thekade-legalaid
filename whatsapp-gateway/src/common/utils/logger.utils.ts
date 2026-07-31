/**
 * Masks the middle digits of a phone number to prevent PII leakage.
 * Keeps the first 4 characters and the last 4 characters.
 */
export function maskPhoneNumber(phoneNumber?: string | null): string {
  if (!phoneNumber) {
    return '';
  }
  if (phoneNumber.length <= 8) {
    return '***';
  }
  const visiblePrefix = phoneNumber.slice(0, 4);
  const visibleSuffix = phoneNumber.slice(-4);
  return `${visiblePrefix}***${visibleSuffix}`;
}

/**
 * Sanitizes logging payloads (webhook, NATS, and API payloads) by masking
 * phone numbers, redacting message text bodies, captions, names, and media URLs.
 */
export function sanitizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  // Deep clone to prevent mutating the actual active payload in the application
  const copy = JSON.parse(JSON.stringify(payload)) as
    | Record<string, unknown>
    | unknown[];

  const walk = (obj: Record<string, unknown> | unknown[]) => {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => {
        if (item && typeof item === 'object') {
          walk(item as Record<string, unknown> | unknown[]);
        }
      });
      return;
    }

    const dict = obj;
    for (const key of Object.keys(dict)) {
      const value = dict[key];
      if (value === undefined || value === null) {
        continue;
      }

      if (
        key === 'from' ||
        key === 'to' ||
        key === 'recipient_id' ||
        key === 'wa_id'
      ) {
        if (typeof value === 'string') {
          dict[key] = maskPhoneNumber(value);
        }
      } else if (key === 'body' || key === 'text') {
        if (typeof value === 'string') {
          dict[key] = '[REDACTED_TEXT]';
        } else if (typeof value === 'object') {
          walk(value as Record<string, unknown> | unknown[]);
        }
      } else if (key === 'caption') {
        if (typeof value === 'string') {
          dict[key] = '[REDACTED_CAPTION]';
        }
      } else if (key === 'mediaUrl' || key === 'link') {
        if (typeof value === 'string') {
          dict[key] = '[REDACTED_URL]';
        }
      } else if (key === 'name') {
        if (typeof value === 'string') {
          dict[key] = '[REDACTED_NAME]';
        } else if (typeof value === 'object') {
          walk(value as Record<string, unknown> | unknown[]);
        }
      } else if (typeof value === 'object') {
        walk(value as Record<string, unknown> | unknown[]);
      }
    }
  };

  walk(copy);
  return copy;
}
