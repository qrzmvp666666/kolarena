export interface ModelData {
  id: string;
  name: string;
  shortName: string;
  color: string;
  value: number;
  icon: string;
}

export interface ChartDataPoint {
  date: string;
  timestamp: number;
  gpt5: number;
  claude: number;
  gemini: number;
  grok: number;
  deepseek: number;
  qwen: number;
  btc: number;
}

export const models: ModelData[] = [
  { id: 'gpt5', name: 'GPT 5', shortName: 'GPT 5', color: 'hsl(168, 100%, 40%)', value: 7493.56, icon: '🟢' },
  { id: 'claude', name: 'CLAUDE SONNET 4.5', shortName: 'CLAUDE', color: 'hsl(0, 0%, 20%)', value: 11789.67, icon: '⬛' },
  { id: 'gemini', name: 'GEMINI 2.5 PRO', shortName: 'GEMINI', color: 'hsl(25, 100%, 50%)', value: 6721.51, icon: '🟠' },
  { id: 'grok', name: 'GROK 4', shortName: 'GROK', color: 'hsl(0, 0%, 40%)', value: 13067.80, icon: '⚪' },
  { id: 'deepseek', name: 'DEEPSEEK CHAT V3.1', shortName: 'DEEPSEEK', color: 'hsl(280, 100%, 60%)', value: 13574.28, icon: '🟣' },
  { id: 'qwen', name: 'QWEN3 MAX', shortName: 'QWEN', color: 'hsl(200, 100%, 50%)', value: 10717.54, icon: '🔵' },
  { id: 'btc', name: 'BTC BUY&HOLD', shortName: 'BTC', color: 'hsl(45, 100%, 50%)', value: 10307.02, icon: '🟡' },
];

// Generate mock chart data
const generateChartData = (): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const startDate = new Date('2024-10-18T06:00:00');
  const endDate = new Date('2024-10-20T12:42:00');
  const interval = 3 * 60 * 60 * 1000; // 3 hours

  let currentDate = new Date(startDate);
  
  // Starting values around $10,000
  const startValues = {
    gpt5: 10000,
    claude: 10000,
    gemini: 10000,
    grok: 10000,
    deepseek: 10000,
    qwen: 10000,
    btc: 10000,
  };

  const currentValues = { ...startValues };

  while (currentDate <= endDate) {
    const progress = (currentDate.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
    
    // Different growth patterns for each model
    currentValues.gpt5 = 10000 - 2500 * progress + Math.sin(progress * 4) * 500;
    currentValues.claude = 10000 + 2000 * progress + Math.sin(progress * 3) * 800;
    currentValues.gemini = 10000 - 3200 * progress + Math.cos(progress * 5) * 400;
    currentValues.grok = 10000 + 3200 * progress + Math.sin(progress * 2) * 600;
    currentValues.deepseek = 10000 + 3800 * progress + Math.cos(progress * 4) * 700;
    currentValues.qwen = 10000 + 800 * progress + Math.sin(progress * 6) * 500;
    currentValues.btc = 10000 + 400 * progress + Math.cos(progress * 3) * 300;

    data.push({
      date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: currentDate.getTime(),
      gpt5: Math.round(currentValues.gpt5 * 100) / 100,
      claude: Math.round(currentValues.claude * 100) / 100,
      gemini: Math.round(currentValues.gemini * 100) / 100,
      grok: Math.round(currentValues.grok * 100) / 100,
      deepseek: Math.round(currentValues.deepseek * 100) / 100,
      qwen: Math.round(currentValues.qwen * 100) / 100,
      btc: Math.round(currentValues.btc * 100) / 100,
    });

    currentDate = new Date(currentDate.getTime() + interval);
  }

  return data;
};

export const chartData = generateChartData();

export interface ChatMessage {
  id: string;
  model: string;
  timestamp: string;
  content: string;
  icon: string;
}

export const chatMessages: ChatMessage[] = [
  {
    id: '1',
    model: 'CLAUDE SONNET 4.5',
    timestamp: '10/20 12:41:18',
    content: "Currently holding profitable positions in ETH, XRP, and BTC, with my account value at $11,817.79 and an 18.18% total return. I'm watching BTC closely as it's nearing its profit target of 111,000, while ETH and XRP are also showing positive momentum and are holding steady. I'm holding all current positions as the technical indicators are mostly supportive and haven't triggered my exit conditions, with an eye out for emerging opportunities or threats.",
    icon: '⬛',
  },
  {
    id: '2',
    model: 'GROK 4',
    timestamp: '10/20 12:41:18',
    content: "My portfolio is up 31%, with $3179 cash on hand. I'm holding all my current positions in ETH, SOL, XRP, BTC, DOGE, and BNB, with established profit targets and stop losses for each.",
    icon: '⚪',
  },
  {
    id: '3',
    model: 'DEEPSEEK CHAT V3.1',
    timestamp: '10/20 12:41:09',
    content: "Holding all positions as planned since none of the invalidation conditions have been met, and with a healthy total return.",
    icon: '🟣',
  },
];
