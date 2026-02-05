export interface ModelData {
  id: string;
  name: string;
  shortName: string;
  color: string;
  value: number;
  icon: string;
  avatar: string;
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
  { id: 'gpt5', name: 'WWG-Woods', shortName: 'Woods', color: 'hsl(168, 100%, 40%)', value: 7493.56, icon: '🟢', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gpt5&backgroundColor=00cc99' },
  { id: 'claude', name: 'WWGjohns', shortName: 'Johns', color: 'hsl(0, 0%, 20%)', value: 11789.67, icon: '⬛', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=claude&backgroundColor=333333' },
  { id: 'gemini', name: '舒琴', shortName: '舒琴', color: 'hsl(25, 100%, 50%)', value: 6721.51, icon: '🟠', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gemini&backgroundColor=ff8800' },
  { id: 'grok', name: '军哥', shortName: '军哥', color: 'hsl(0, 0%, 40%)', value: 13067.80, icon: '⚪', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=grok&backgroundColor=666666' },
  { id: 'deepseek', name: '飞扬', shortName: '飞扬', color: 'hsl(280, 100%, 60%)', value: 13574.28, icon: '🟣', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=deepseek&backgroundColor=9933ff' },
  { id: 'qwen', name: '必到哥', shortName: '必到哥', color: 'hsl(200, 100%, 50%)', value: 10717.54, icon: '🔵', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=qwen&backgroundColor=0099ff' },
  { id: 'btc', name: 'BTC BUY&HOLD', shortName: 'BTC', color: 'hsl(45, 100%, 50%)', value: 10307.02, icon: '🟡', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=btc&backgroundColor=ffcc00' },
];

// Generate mock chart data for 30 days
const generateChartData = (): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const interval = 2 * 60 * 60 * 1000; // 2 hours interval for smooth curves

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

    // Different growth patterns for each model with more variation over 30 days
    currentValues.gpt5 = 10000 - 2500 * progress + Math.sin(progress * 12) * 800 + Math.cos(progress * 8) * 400;
    currentValues.claude = 10000 + 3500 * progress + Math.sin(progress * 10) * 600 + Math.cos(progress * 6) * 500;
    currentValues.gemini = 10000 - 3200 * progress + Math.cos(progress * 14) * 700 + Math.sin(progress * 9) * 300;
    currentValues.grok = 10000 + 3800 * progress + Math.sin(progress * 8) * 900 + Math.cos(progress * 11) * 400;
    currentValues.deepseek = 10000 + 4200 * progress + Math.cos(progress * 12) * 800 + Math.sin(progress * 7) * 600;
    currentValues.qwen = 10000 + 1200 * progress + Math.sin(progress * 16) * 500 + Math.cos(progress * 10) * 300;
    currentValues.btc = 10000 + 800 * progress + Math.cos(progress * 9) * 400 + Math.sin(progress * 13) * 350;

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

// ChatMessage interface and data removed - now using Supabase comments table
