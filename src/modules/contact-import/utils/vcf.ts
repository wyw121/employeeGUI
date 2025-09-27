import type { ContactNumberDto } from '../ui/services/contactNumberService';

export function buildVcfFromNumbers(numbers: ContactNumberDto[]): string {
  return numbers
    .map((n, idx) => [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${n.name || `联系人${idx + 1}`}`,
      `N:${n.name || `联系人${idx + 1}`};;;;`,
      `TEL:${n.phone}`,
      'END:VCARD',
    ].join('\n'))
    .join('\n\n');
}
