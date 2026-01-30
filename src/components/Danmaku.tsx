import { useEffect, useState, useRef } from 'react';

interface DanmakuMessage {
  id: string;
  text: string;
  top: number;
  color: string;
  speed: number;
  fontSize: number;
}

const messages = [
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

const colors = [
  'hsl(168, 100%, 50%)',  // cyan
  'hsl(280, 100%, 70%)',  // purple
  'hsl(25, 100%, 60%)',   // orange
  'hsl(200, 100%, 60%)',  // blue
  'hsl(45, 100%, 60%)',   // yellow
  'hsl(0, 0%, 90%)',      // white
];

const Danmaku = () => {
  const [danmakuList, setDanmakuList] = useState<DanmakuMessage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    const addDanmaku = () => {
      const newDanmaku: DanmakuMessage = {
        id: `danmaku-${idCounter.current++}`,
        text: messages[Math.floor(Math.random() * messages.length)],
        top: Math.random() * 80 + 5, // 5% to 85% from top
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 8 + 12, // 12-20 seconds
        fontSize: Math.random() * 4 + 14, // 14-18px
      };

      setDanmakuList(prev => [...prev, newDanmaku]);

      // Remove after animation completes
      setTimeout(() => {
        setDanmakuList(prev => prev.filter(d => d.id !== newDanmaku.id));
      }, newDanmaku.speed * 1000);
    };

    // Add initial danmaku
    for (let i = 0; i < 5; i++) {
      setTimeout(() => addDanmaku(), i * 500);
    }

    // Add new danmaku periodically
    const interval = setInterval(addDanmaku, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none z-10"
      style={{ top: '88px', bottom: '60px' }} // Avoid top nav and bottom bar
    >
      {danmakuList.map((danmaku) => (
        <div
          key={danmaku.id}
          className="absolute whitespace-nowrap font-mono font-medium animate-danmaku"
          style={{
            top: `${danmaku.top}%`,
            color: danmaku.color,
            fontSize: `${danmaku.fontSize}px`,
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
            animationDuration: `${danmaku.speed}s`,
          }}
        >
          {danmaku.text}
        </div>
      ))}
    </div>
  );
};

export default Danmaku;