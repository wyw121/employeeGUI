import React from 'react';
import { ContactImportWizard } from '../../modules/contact-import';
import { PageWrapper } from '../../components/layout';

const ContactImportPage: React.FC = () => {
  return (
    <PageWrapper title="联系人导入向导" subtitle="上传 VCF → 检测设备 → 配置策略 → 导入与验证">
      <ContactImportWizard />
    </PageWrapper>
  );
};

export default ContactImportPage;
