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
  models: { zh: '信号', en: 'SIGNALS' },
  joinWaitlist: { zh: '加入等待', en: 'JOIN WAITLIST' },
  aboutUs: { zh: '关于我们', en: 'ABOUT US' },
  toggleDanmaku: { zh: '切换弹幕', en: 'Toggle Danmaku' },
  closeDanmaku: { zh: '关闭弹幕', en: 'Close Danmaku' },
  openDanmaku: { zh: '开启弹幕', en: 'Open Danmaku' },
  loginRegister: { zh: '登录/注册', en: 'Login/Register' },
  logout: { zh: '退出登录', en: 'Logout' },
  emailLogin: { zh: '邮箱登录', en: 'Email' },
  phoneLogin: { zh: '手机登录', en: 'Phone' },
  emailPlaceholder: { zh: '请输入邮箱', en: 'Enter your email' },
  phonePlaceholder: { zh: '请输入手机号', en: 'Enter your phone number' },
  passwordPlaceholder: { zh: '请输入密码', en: 'Enter your password' },
  login: { zh: '登录', en: 'Login' },
  orContinueWith: { zh: '或使用以下方式', en: 'or continue with' },
  googleLogin: { zh: 'Google 登录', en: 'Continue with Google' },
  noAccount: { zh: '还没有账号?', en: "Don't have an account?" },
  register: { zh: '立即注册', en: 'Register' },
  
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

  // Signals Page
  tradingSignals: { zh: '交易信号', en: 'Trading Signals' },
  signalSummary: { zh: '所有频道的交易信号汇总', en: 'Summary of trading signals from all channels' },
  signalAll: { zh: '全部', en: 'All' },
  signalSubscribed: { zh: '已订阅', en: 'Subscribed' },
  signalUnsubscribed: { zh: '未订阅', en: 'Unsubscribed' },
  searchPlaceholder: { zh: '搜索币种、作者...', en: 'Search coin, author...' },
  refresh: { zh: '刷新', en: 'Refresh' },
  signalSpot: { zh: '现货', en: 'Spot' },
  signalLong: { zh: '做多', en: 'Long' },
  signalShort: { zh: '做空', en: 'Short' },
  signal7dCount: { zh: '7日信号 {count}条', en: '{count} signals in 7d' },
  entryPrice: { zh: '入场', en: 'Entry' },
  takeProfit: { zh: '止盈', en: 'TP' },
  stopLoss: { zh: '止损', en: 'SL' },
  leverage: { zh: '杠杆', en: 'Lev' },
  notProvided: { zh: '未提供', en: 'N/A' },
  signalCount: { zh: '条信号', en: ' signals' },
  subscribe: { zh: '订阅', en: 'Subscribe' },
  view: { zh: '查看', en: 'View' },
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
