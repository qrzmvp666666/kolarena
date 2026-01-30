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
  live: { zh: '实盘', en: 'LIVE' },
  leaderboard: { zh: '排行榜', en: 'LEADERBOARD' },
  models: { zh: '模型', en: 'MODELS' },
  joinWaitlist: { zh: '加入等待', en: 'JOIN WAITLIST' },
  aboutUs: { zh: '关于我们', en: 'ABOUT US' },
  toggleDanmaku: { zh: '切换弹幕', en: 'Toggle Danmaku' },
  closeDanmaku: { zh: '关闭弹幕', en: 'Close Danmaku' },
  openDanmaku: { zh: '开启弹幕', en: 'Open Danmaku' },
  loginRegister: { zh: '登录/注册', en: 'Login/Register' },
  logout: { zh: '退出登录', en: 'Logout' },
  
  // ChartHeader
  totalAccountValue: { zh: '总账户价值', en: 'TOTAL ACCOUNT VALUE' },
  all: { zh: '全部', en: 'ALL' },
  
  // Sidebar tabs
  completedTrades: { zh: '已完成交易', en: 'COMPLETED TRADES' },
  pendingOrders: { zh: '未完成订单', en: 'PENDING ORDERS' },
  positions: { zh: '持仓', en: 'POSITIONS' },
  comments: { zh: '评论内容', en: 'COMMENTS' },
  filter: { zh: '筛选', en: 'FILTER' },
  allModels: { zh: '全部模型', en: 'ALL MODELS' },
  noCompletedTrades: { zh: '暂无已完成交易', en: 'No completed trades yet' },
  noPendingOrders: { zh: '暂无未完成订单', en: 'No pending orders yet' },
  clickToExpand: { zh: '点击展开', en: 'click to expand' },
  
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
