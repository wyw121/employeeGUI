import React, { Suspense } from 'react';
import { PageWrapper } from '../../components/layout';

const ContactImportWizard = React.lazy(() => import('../../modules/contact-import/ui/ContactImportWizard').then(m => ({ default: m.ContactImportWizard })));

const ContactImportPage: React.FC = () => {
  return (
    <PageWrapper title="联系人导入向导" subtitle="上传 VCF → 检测设备 → 配置策略 → 导入与验证">
      <Suspense fallback={<div style={{ padding: 16 }}>加载中...</div>}>
        <ContactImportWizard />
      </Suspense>
    </PageWrapper>
  );
};

export default ContactImportPage;
