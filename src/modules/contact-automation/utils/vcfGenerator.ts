/**
 * VCF文件生成工具
 */

export interface VcfContact {
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  note?: string;
}

export interface VcfGenerationOptions {
  encoding?: 'utf-8' | 'gbk';
  version?: '2.1' | '3.0' | '4.0';
  includePhoto?: boolean;
  batchSize?: number;
}

/**
 * 生成VCF文件内容
 */
export function generateVcfContent(
  contacts: VcfContact[],
  options: VcfGenerationOptions = {}
): string {
  const { version = '3.0', encoding = 'utf-8' } = options;
  
  return contacts.map(contact => {
    const vcfLines = [
      'BEGIN:VCARD',
      `VERSION:${version}`,
      `FN:${contact.name}`,
      `N:${contact.name};;;;`,
    ];
    
    if (contact.phone) {
      vcfLines.push(`TEL:${contact.phone}`);
    }
    
    if (contact.email) {
      vcfLines.push(`EMAIL:${contact.email}`);
    }
    
    if (contact.organization) {
      vcfLines.push(`ORG:${contact.organization}`);
    }
    
    if (contact.note) {
      vcfLines.push(`NOTE:${contact.note}`);
    }
    
    vcfLines.push('END:VCARD');
    
    return vcfLines.join('\n');
  }).join('\n\n');
}

/**
 * 解析CSV格式通讯录
 */
export function parseContactsFromCsv(csvContent: string): VcfContact[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('姓名'));
  const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('电话'));
  const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('邮箱'));
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      name: values[nameIndex]?.trim() || 'Unknown',
      phone: values[phoneIndex]?.trim(),
      email: values[emailIndex]?.trim(),
    };
  }).filter(contact => contact.name !== 'Unknown');
}

/**
 * 验证VCF文件格式
 */
export function validateVcfContent(vcfContent: string): {
  valid: boolean;
  contactCount: number;
  errors: string[];
} {
  const errors: string[] = [];
  let contactCount = 0;
  
  const vcardBlocks = vcfContent.split('END:VCARD').filter(block => block.trim());
  
  for (const block of vcardBlocks) {
    if (!block.includes('BEGIN:VCARD')) {
      errors.push(`Invalid VCARD format: missing BEGIN:VCARD`);
      continue;
    }
    
    if (!block.includes('VERSION:')) {
      errors.push(`Missing VERSION in VCARD`);
    }
    
    if (!block.includes('FN:')) {
      errors.push(`Missing FN (full name) in VCARD`);
    }
    
    contactCount++;
  }
  
  return {
    valid: errors.length === 0,
    contactCount,
    errors
  };
}