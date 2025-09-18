/**
 * 页面分析上下文提供者
 */

import React, { createContext } from 'react';
import { PageAnalysisApplicationService } from './PageAnalysisApplicationService';
import { createPageAnalysisStore } from './PageAnalysisStore';

type PageAnalysisStoreType = ReturnType<typeof createPageAnalysisStore>;

export const PageAnalysisStoreContext = createContext<PageAnalysisStoreType | null>(null);

interface PageAnalysisProviderProps {
  children: React.ReactNode;
  applicationService: PageAnalysisApplicationService;
}

export const PageAnalysisProvider: React.FC<PageAnalysisProviderProps> = ({
  children,
  applicationService,
}) => {
  const store = React.useMemo(
    () => createPageAnalysisStore(applicationService),
    [applicationService]
  );

  return (
    <PageAnalysisStoreContext.Provider value={store}>
      {children}
    </PageAnalysisStoreContext.Provider>
  );
};