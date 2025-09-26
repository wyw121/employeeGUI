import React, { Suspense } from 'react';
import { PageWrapper } from '../../components/layout';

const ContactImportWorkbench = React.lazy(() => import('../../modules/contact-import/ui/ContactImportWorkbench').then(m => ({ default: m.ContactImportWorkbench })));

const ContactImportPage: React.FC = () => {
  return (
    <PageWrapper title="联系人导入工作台" subtitle="随时导入TXT到号码池 · 随时选择设备与生成VCF并导入">
      <Suspense fallback={<div style={{ padding: 16 }}>加载中...</div>}>
        <ContactImportWorkbench />
      </Suspense>
    </PageWrapper>
  );
};

export default ContactImportPage;
