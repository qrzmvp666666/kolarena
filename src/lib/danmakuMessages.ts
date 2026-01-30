export interface CommentMessage {
  id: string;
  text: string;
  timestamp: string;
  color: string;
}

export const danmakuMessages = [
  "DEEPSEEK 又涨了！🚀",
  "GPT-5 回调了，抄底吗？",
  "CLAUDE 稳如老狗 💪",
  "GROK 冲冲冲！",
  "BTC 永远滴神",
  "这波我看好 QWEN",
  "GEMINI 跌麻了 😭",
  "AI 交易真香",
  "谁在抄底 GPT-5？",
  "DEEPSEEK YYDS",
  "跟着 AI 赚钱 💰",
  "这行情太刺激了",
  "CLAUDE 信仰充值",
  "今天又是赚钱的一天",
  "BTC 什么时候破 120K？",
  "AI 模型打架谁赢？",
  "GROK 起飞了 ✈️",
  "观望中...",
  "冲就完了！",
  "稳住，我们能赢",
];

export const danmakuColors = [
  'hsl(168, 100%, 50%)',  // cyan
  'hsl(280, 100%, 70%)',  // purple
  'hsl(25, 100%, 60%)',   // orange
  'hsl(200, 100%, 60%)',  // blue
  'hsl(45, 100%, 60%)',   // yellow
  'hsl(0, 0%, 90%)',      // white
];

// Generate static comment list for the sidebar
export const generateCommentsList = (): CommentMessage[] => {
  const now = new Date();
  return danmakuMessages.map((text, index) => {
    const time = new Date(now.getTime() - index * 30000); // 30 seconds apart
    return {
      id: `comment-${index}`,
      text,
      timestamp: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      color: danmakuColors[index % danmakuColors.length],
    };
  });
};
