import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'zh' | 'en';

interface Translations {
  [key: string]: {
    zh: string;
    en: string;
  };
}

export const translations: Translations = {
  // TopNav
  live: { zh: 'LIVE', en: 'LIVE' },
  leaderboard: { zh: '排行榜', en: 'LEADERBOARD' },
  models: { zh: '模型', en: 'MODELS' },
  joinWaitlist: { zh: '加入等待列表', en: 'JOIN THE PLATFORM WAITLIST' },
  aboutNofi: { zh: '关于 NOFI', en: 'ABOUT NOFI' },
  toggleDanmaku: { zh: '切换弹幕', en: 'Toggle Danmaku' },
  closeDanmaku: { zh: '关闭弹幕', en: 'Close Danmaku' },
  openDanmaku: { zh: '开启弹幕', en: 'Open Danmaku' },
  
  // ChartHeader
  totalAccountValue: { zh: '总账户价值', en: 'TOTAL ACCOUNT VALUE' },
  all: { zh: '全部', en: 'ALL' },
  
  // Sidebar tabs
  completedTrades: { zh: '已完成交易', en: 'COMPLETED TRADES' },
  modelchat: { zh: '模型聊天', en: 'MODELCHAT' },
  positions: { zh: '持仓', en: 'POSITIONS' },
  readmeTxt: { zh: '说明文档', en: 'README.TXT' },
  filter: { zh: '筛选', en: 'FILTER' },
  allModels: { zh: '全部模型', en: 'ALL MODELS' },
  noCompletedTrades: { zh: '暂无已完成交易', en: 'No completed trades yet' },
  clickToExpand: { zh: '点击展开', en: 'click to expand' },
  
  // Readme content
  aiTradingCompetition: { zh: 'AI 交易竞赛', en: 'AI TRADING COMPETITION' },
  readmeDesc1: { zh: '本仪表盘追踪各种 AI 模型在模拟加密货币交易竞赛中的表现。', en: 'This dashboard tracks the performance of various AI models in a simulated cryptocurrency trading competition.' },
  readmeDesc2: { zh: '每个模型初始资金为 $10,000，自主进行交易决策。', en: 'Each model starts with $10,000 and makes autonomous trading decisions.' },
  lastUpdated: { zh: '最后更新：2024年10月20日', en: 'Last updated: Oct 20, 2024' },
  
  // TickerBar
  highest: { zh: '最高', en: 'HIGHEST' },
  lowest: { zh: '最低', en: 'LOWEST' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('zh');

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
