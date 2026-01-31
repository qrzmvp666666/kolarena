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
  joinCommunity: { zh: '加入社区', en: 'COMMUNITY' },
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
  futures: { zh: '合约', en: 'Futures' },
  spot: { zh: '现货', en: 'Spot' },
  comingSoon: { zh: '即将推出', en: 'Coming Soon' },
  signalType: { zh: '信号类型', en: 'Signal Type' },
  tradingPair: { zh: '交易对', en: 'Trading Pair' },
  allPairs: { zh: '全部', en: 'All' },
  allTypes: { zh: '全部', en: 'All' },

  // Leaderboard Page
  competition: { zh: '比赛', en: 'Competition' },
  comprehensiveIndex: { zh: '综合指数', en: 'Comprehensive' },
  average: { zh: '平均', en: 'Average' },
  overallData: { zh: '总体数据', en: 'Overall Data' },
  advancedAnalysis: { zh: '高级分析', en: 'Advanced Analysis' },
  model: { zh: '模型', en: 'MODEL' },
  trader: { zh: '交易员', en: 'TRADER' },
  accountValue: { zh: '账户价值', en: 'ACCOUNT VALUE' },
  returnRate: { zh: '收益率', en: 'RETURN RATE' },
  totalPnL: { zh: '总盈亏', en: 'TOTAL P&L' },
  winRate: { zh: '胜率', en: 'WIN RATE' },
  maxProfit: { zh: '最大盈利', en: 'MAX PROFIT' },
  maxLoss: { zh: '最大亏损', en: 'MAX LOSS' },
  sharpeRatio: { zh: '夏普比率', en: 'Sharpe Ratio' },
  winningModel: { zh: '获胜交易员', en: 'Top Trader' },
  totalEquity: { zh: '总权益', en: 'Total Equity' },
  note: { zh: '注意', en: 'Note' },
  leaderboardNote: { zh: '所有统计数据（除账户价值和盈亏外）仅反映已完成交易。活跃仓位在关闭前不计入计算。', en: 'All statistics (except account value and P&L) only reflect completed trades. Active positions are not included until closed.' },
  leaderboardSummary: { zh: '所有交易员的业绩排名汇总', en: 'Performance ranking summary of all traders' },
  searchTrader: { zh: '搜索交易员...', en: 'Search trader...' },
  coinType: { zh: '币种', en: 'Coin' },
  positive: { zh: '盈利', en: 'Positive' },
  negative: { zh: '亏损', en: 'Negative' },
  lowRisk: { zh: '低风险', en: 'Low Risk' },
  highRisk: { zh: '高风险', en: 'High Risk' },
  timeRange: { zh: '时间范围', en: 'Time Range' },
  timeRange_week: { zh: '每周', en: 'Weekly' },
  timeRange_month: { zh: '每月', en: 'Monthly' },
  timeRange_quarter: { zh: '每季度', en: 'Quarterly' },
  timeRange_year: { zh: '每年', en: 'Yearly' },
  timeRange_custom: { zh: '自定义', en: 'Custom' },
  selectDateRange: { zh: '选择日期范围', en: 'Select date range' },
  startDate: { zh: '开始日期', en: 'Start Date' },
  endDate: { zh: '结束日期', en: 'End Date' },
  confirm: { zh: '确认', en: 'Confirm' },

  // Advanced Analysis
  selectTrader: { zh: 'KOL', en: 'KOL' },
  profitTrend: { zh: '收益趋势', en: 'Profit Trend' },
  coinDistribution: { zh: '币种收益占比', en: 'Coin Distribution' },
  tradeHistory: { zh: '交易记录', en: 'Trade History' },
  tradeTime: { zh: '交易时间', en: 'Time' },
  tradePair: { zh: '交易对', en: 'Pair' },
  tradeType: { zh: '类型', en: 'Type' },
  tradeDirection: { zh: '方向', en: 'Direction' },
  tradeAmount: { zh: '数量', en: 'Amount' },
  tradePrice: { zh: '价格', en: 'Price' },
  tradePnL: { zh: '盈亏', en: 'P&L' },
  longPosition: { zh: '做多', en: 'Long' },
  shortPosition: { zh: '做空', en: 'Short' },
  open: { zh: '开仓', en: 'Open' },
  close: { zh: '平仓', en: 'Close' },
  cumulativeProfit: { zh: '累计收益', en: 'Cumulative Profit' },
  dailyProfit: { zh: '日收益', en: 'Daily Profit' },
  traderPerformance: { zh: '交易员表现', en: 'Trader Performance' },
  totalTrades: { zh: '总交易次数', en: 'Total Trades' },
  avgProfit: { zh: '平均收益', en: 'Avg Profit' },
  profitFactor: { zh: '盈亏比', en: 'Profit Factor' },

  // Community Modal
  communityDesc: { zh: '扫码加入我们的社区，获取最新资讯和交易信号', en: 'Scan to join our community for the latest news and trading signals' },
  scanToJoin: { zh: '扫描二维码加入', en: 'Scan QR code to join' },

  // About Page
  aboutTitle: { zh: '关于 KolArena', en: 'About KolArena' },
  aboutSubtitle: { zh: '一个透明、公正的交易员业绩追踪与排名平台', en: 'A transparent and fair trader performance tracking and ranking platform' },
  aboutMissionTitle: { zh: '我们的使命', en: 'Our Mission' },
  aboutMissionDesc: { zh: 'KolArena 致力于为加密货币交易者提供一个公开透明的业绩展示平台。我们相信，真实的交易数据比任何营销话术都更有说服力。通过实时追踪和验证交易员的实盘表现，我们帮助投资者做出更明智的选择。', en: 'KolArena is dedicated to providing cryptocurrency traders with an open and transparent performance display platform. We believe that real trading data is more convincing than any marketing pitch. By tracking and verifying traders\' live performance in real-time, we help investors make smarter choices.' },
  aboutWhyChoose: { zh: '为什么选择我们', en: 'Why Choose Us' },
  aboutFeature1Title: { zh: '实盘验证', en: 'Live Verification' },
  aboutFeature1Desc: { zh: '所有交易数据均来自真实账户，确保数据的真实性和可靠性', en: 'All trading data comes from real accounts, ensuring authenticity and reliability' },
  aboutFeature2Title: { zh: '透明公开', en: 'Full Transparency' },
  aboutFeature2Desc: { zh: '完整展示交易员的盈亏记录、胜率、最大回撤等关键指标', en: 'Complete display of traders\' P&L records, win rates, max drawdown and other key metrics' },
  aboutFeature3Title: { zh: '实时更新', en: 'Real-time Updates' },
  aboutFeature3Desc: { zh: '交易数据实时同步更新，第一时间掌握市场动态', en: 'Trading data synced in real-time, stay updated with market movements' },
  aboutFeature4Title: { zh: '社区驱动', en: 'Community Driven' },
  aboutFeature4Desc: { zh: '活跃的交易者社区，分享策略、交流心得', en: 'Active trader community for sharing strategies and exchanging insights' },
  aboutFeature5Title: { zh: '多元资产', en: 'Multi-Asset' },
  aboutFeature5Desc: { zh: '支持多种加密货币交易对，满足不同投资需求', en: 'Support for multiple crypto trading pairs to meet different investment needs' },
  aboutFeature6Title: { zh: '专业评级', en: 'Professional Rating' },
  aboutFeature6Desc: { zh: '基于多维度指标的专业交易员评级系统', en: 'Professional trader rating system based on multi-dimensional metrics' },
  aboutTeamTitle: { zh: '我们的团队', en: 'Our Team' },
  aboutTeamDesc: { zh: '我们是一支由资深交易员、区块链开发者和金融分析师组成的团队，拥有多年加密货币市场经验。我们深知交易者的痛点，致力于打造最可靠的交易员追踪平台。', en: 'We are a team of experienced traders, blockchain developers, and financial analysts with years of experience in the cryptocurrency market. We understand traders\' pain points and are committed to building the most reliable trader tracking platform.' },
  
  // Account Page
  myAccount: { zh: '我的账户', en: 'My Account' },
  purchaseRecords: { zh: '购买记录', en: 'Purchase Records' },
  tradingAccounts: { zh: '交易账户', en: 'Trading Accounts' },
  backToHome: { zh: '返回首页', en: 'Back to Home' },
  completed: { zh: '已完成', en: 'Completed' },
  pending: { zh: '待处理', en: 'Pending' },
  failed: { zh: '失败', en: 'Failed' },
  active: { zh: '活跃', en: 'Active' },
  inactive: { zh: '未激活', en: 'Inactive' },
  addAccount: { zh: '添加账户', en: 'Add Account' },
  created: { zh: '创建于', en: 'Created' },
  balance: { zh: '余额', en: 'Balance' },
  noPurchaseRecords: { zh: '暂无购买记录', en: 'No purchase records' },
  noTradingAccounts: { zh: '暂无交易账户', en: 'No trading accounts' },
  
  // Plan Types
  planMonthly: { zh: '月费会员', en: 'Monthly' },
  planQuarterly: { zh: '季度会员', en: 'Quarterly' },
  planYearly: { zh: '年费会员', en: 'Yearly' },
  planPriceMonthly: { zh: '10 USDT', en: '10 USDT' },
  planPriceQuarterly: { zh: '28 USDT', en: '28 USDT' },
  planPriceYearly: { zh: '99 USDT', en: '99 USDT' },
  choosePlan: { zh: '选择套餐', en: 'Choose Plan' },
  perMonth: { zh: '/月', en: '/month' },
  perQuarter: { zh: '/季度', en: '/quarter' },
  perYear: { zh: '/年', en: '/year' },
  payWithStripe: { zh: 'Stripe 支付', en: 'Pay with Stripe' },
  payWithCrypto: { zh: '加密货币支付', en: 'Pay with Crypto' },
  mostPopular: { zh: '最受欢迎', en: 'Most Popular' },
  bestValue: { zh: '最划算', en: 'Best Value' },
  saveMoney: { zh: '省', en: 'Save' },
  paymentProcessing: { zh: '正在处理支付...', en: 'Processing payment...' },
  paymentNotAvailable: { zh: '支付功能即将上线', en: 'Payment coming soon' },
  
  // Subscription Panel
  subscriptionPlans: { zh: '套餐订阅', en: 'Subscription Plans' },
  subscriptionDesc: { zh: '选择适合您的会员套餐，解锁更多专业功能', en: 'Choose a plan that suits you and unlock more features' },
  includedFeatures: { zh: '包含功能', en: 'Included Features' },
  exclusive: { zh: '专属', en: 'Exclusive' },
  featureSignals: { zh: '实时交易信号推送', en: 'Real-time trading signals' },
  featureCharts: { zh: '专业行情图表分析', en: 'Professional chart analysis' },
  featureChat: { zh: 'AI 智能助手对话', en: 'AI assistant chat' },
  featurePriority: { zh: '优先信号推送', en: 'Priority signal alerts' },
  featureAdvanced: { zh: '高级策略分析', en: 'Advanced strategy analysis' },
  featureVipGroup: { zh: 'VIP 专属社群', en: 'VIP exclusive community' },
  featureExclusive: { zh: '独家市场研报', en: 'Exclusive market reports' },
  securePayment: { zh: '安全支付保障', en: 'Secure payment protection' },
  instantActivation: { zh: '即时开通会员', en: 'Instant activation' },
  cancelAnytime: { zh: '随时可取消订阅', en: 'Cancel anytime' },
  cryptoPayment: { zh: '加密货币支付', en: 'Crypto Payment' },
  payAmount: { zh: '支付金额', en: 'Amount' },
  widgetLoadError: { zh: '无法加载支付组件', en: 'Unable to load payment widget' },
  securePaymentNote: { zh: '由 NOWPayments 提供安全加密货币支付服务', en: 'Secure crypto payment powered by NOWPayments' },
  
  // Redemption
  redemptionCenter: { zh: '兑换中心', en: 'Redemption Center' },
  redeemCode: { zh: '兑换码', en: 'Redeem Code' },
  redeemCodeDesc: { zh: '输入您的兑换码以获取会员权益、积分或其他奖励', en: 'Enter your redemption code to get membership benefits, credits or other rewards' },
  enterRedeemCode: { zh: '请输入兑换码', en: 'Enter redemption code' },
  redeem: { zh: '立即兑换', en: 'Redeem' },
  redeeming: { zh: '兑换中...', en: 'Redeeming...' },
  redeemSuccess: { zh: '兑换成功', en: 'Redemption Successful' },
  redeemSuccessDesc: { zh: '奖励已发放到您的账户', en: 'Reward has been added to your account' },
  redeemError: { zh: '兑换失败', en: 'Redemption Failed' },
  redemptionRecords: { zh: '兑换记录', en: 'Redemption Records' },
  noRedemptionRecords: { zh: '暂无兑换记录', en: 'No redemption records' },
  redeemStatusSuccess: { zh: '已兑换', en: 'Redeemed' },
  redeemStatusExpired: { zh: '已过期', en: 'Expired' },
  redeemStatusUsed: { zh: '已使用', en: 'Used' },
  rewardMembership: { zh: '会员', en: 'Membership' },
  rewardCredits: { zh: '积分', en: 'Credits' },
  rewardVip: { zh: 'VIP', en: 'VIP' },

  // Purchase Steps
  purchaseStepsTitle: { zh: '购买流程', en: 'How to Purchase' },
  purchaseStep1: { zh: '前往「套餐订阅」选择适合您的会员套餐', en: 'Go to "Subscription Plans" and choose a plan' },
  purchaseStep2: { zh: '选择支付方式（Stripe 或加密货币）', en: 'Select payment method (Stripe or Crypto)' },
  purchaseStep3: { zh: '完成支付后，系统自动激活会员权益', en: 'After payment, membership activates automatically' },
  purchaseStep4: { zh: '在此页面查看您的购买记录和订单状态', en: 'View your purchase history and order status here' },

  // Redemption Steps
  redemptionStepsTitle: { zh: '兑换流程', en: 'How to Redeem' },
  redemptionStep1: { zh: '点击顶部「加入社区」获取兑换码', en: 'Click "Join Community" at top to get codes' },
  redemptionStep2: { zh: '在上方输入框输入兑换码', en: 'Enter the code in the input field above' },
  redemptionStep3: { zh: '点击「立即兑换」完成兑换', en: 'Click "Redeem" to complete' },
  redemptionStep4: { zh: '奖励将自动发放到您的账户', en: 'Rewards will be added to your account automatically' },
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
