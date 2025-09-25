import React, { useState } from 'react';
import type { User, UserRole, KnowledgeBankItem, ReviewItem, LiveCall } from '../types';
import {
  TribalGnosisLogo,
  WorkflowIcon,
  AnalyzerIcon,
  DatabaseIcon,
  ConsumerIcon,
  IntegrationsIcon,
  LogisticsIcon,
} from './Icons';
import WorkflowTab from '../tabs/WorkflowTab';
import AnalyzerTab from '../tabs/AnalyzerTab';
import DatabaseTab from '../tabs/DatabaseTab';
import ConsumerSearchTab from '../tabs/ConsumerSearchTab';
import IntegrationsTab from '../tabs/IntegrationsTab';
import LogisticsTab from '../tabs/LogisticsTab';

export type Tab =
  | 'workflow'
  | 'analyzer'
  | 'database'
  | 'consumer-search'
  | 'integrations'
  | 'logistics';

interface MainApplicationProps {
  currentUser: User;
  onLogout: () => void;
  knowledgeBank: KnowledgeBankItem[];
  setKnowledgeBank: React.Dispatch<React.SetStateAction<KnowledgeBankItem[]>>;
  reviewItems: ReviewItem[];
  setReviewItems: React.Dispatch<React.SetStateAction<ReviewItem[]>>;
  liveCall: LiveCall | null;
  setLiveCall: React.Dispatch<React.SetStateAction<LiveCall | null>>;
}

const TABS: Record<Tab, { label: string; icon: React.ReactNode; roles: UserRole[] }> = {
  workflow: { label: 'Workflow', icon: <WorkflowIcon />, roles: ['analyst', 'admin'] },
  analyzer: { label: 'Analyzer', icon: <AnalyzerIcon />, roles: ['analyst', 'admin'] },
  database: { label: 'Database', icon: <DatabaseIcon />, roles: ['analyst', 'admin'] },
  logistics: { label: 'Logistics', icon: <LogisticsIcon />, roles: ['analyst', 'admin'] },
  'consumer-search': {
    label: 'Consumer Search',
    icon: <ConsumerIcon />,
    roles: ['analyst', 'admin'],
  },
  integrations: { label: 'Integrations', icon: <IntegrationsIcon />, roles: ['admin'] },
};

const MainApplication: React.FC<MainApplicationProps> = ({
  currentUser,
  onLogout,
  knowledgeBank,
  setKnowledgeBank,
  reviewItems,
  setReviewItems,
  liveCall,
  setLiveCall,
}) => {
  const { role: userRole, tenantId, name: userName } = currentUser;
  const availableTabs = (Object.keys(TABS) as Tab[]).filter((tab) =>
    TABS[tab].roles.includes(userRole)
  );
  const [activeTab, setActiveTab] = useState<Tab>(availableTabs[0]);

  const renderTabContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'workflow':
          return (
            <WorkflowTab
              knowledgeBank={knowledgeBank}
              setKnowledgeBank={setKnowledgeBank}
              reviewItems={reviewItems}
              setReviewItems={setReviewItems}
              tenantId={tenantId}
            />
          );
        case 'analyzer':
          return (
            <AnalyzerTab
              setReviewItems={setReviewItems}
              setActiveTab={setActiveTab}
              tenantId={tenantId}
              liveCall={liveCall}
              setLiveCall={setLiveCall}
            />
          );
        case 'database':
          return (
            <DatabaseTab
              knowledgeBank={knowledgeBank}
              tenantId={tenantId}
              setKnowledgeBank={setKnowledgeBank}
            />
          );
        case 'logistics':
          return <LogisticsTab knowledgeBank={knowledgeBank} />;
        case 'consumer-search':
          return <ConsumerSearchTab knowledgeBank={knowledgeBank} />;
        case 'integrations':
          return (
            <IntegrationsTab
              setReviewItems={setReviewItems}
              setActiveTab={setActiveTab}
              setLiveCall={setLiveCall}
            />
          );
        default:
          return null;
      }
    })();
    // Wrap content in a key-driven div to re-trigger animations on tab change
    return (
      <div key={activeTab} className="animate-content-fade-in">
        {content}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm sticky top-0 z-40 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center gap-4">
              <TribalGnosisLogo className="h-10 w-10 text-sky-600" />
              <h1 className="text-xl font-bold text-slate-800 hidden sm:block tracking-tight">
                Tribal Gnosis
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs text-slate-500 font-semibold">USER</span>
                <p className="text-sm font-semibold capitalize text-slate-700">{userName}</p>
              </div>
              <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-semibold">ROLE</span>
                <p className="text-sm font-bold capitalize text-sky-600">{userRole}</p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200/80 bg-white">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mb-px flex space-x-8"
          aria-label="Tabs"
        >
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${
                activeTab === tab
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors duration-150`}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {TABS[tab].icon}
              {TABS[tab].label}
            </button>
          ))}
        </nav>
      </div>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">{renderTabContent()}</div>
      </main>
    </div>
  );
};

export default MainApplication;
