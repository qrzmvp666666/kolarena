import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface DanmakuMessage {
  id: string;
  text: string;
  top: number;
  color: string;
  speed: number;
  fontSize: number;
}

interface Comment {
  id: number;
  content: string;
  display_time: string;
  user_display_name: string;
}

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
  const processedComments = useRef<Set<number>>(new Set());

  // 添加弹幕到屏幕
  const addDanmaku = (comment: Comment) => {
    // 避免重复添加
    if (processedComments.current.has(comment.id)) return;
    processedComments.current.add(comment.id);

    const speed = Math.random() * 8 + 12; // 12-20 seconds
    
    const newDanmaku: DanmakuMessage = {
      id: `danmaku-${comment.id}`,
      text: comment.content,
      top: Math.random() * 80 + 5, // 5% to 85% from top
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: speed,
      fontSize: Math.random() * 4 + 14, // 14-18px
    };

    setDanmakuList(prev => [...prev, newDanmaku]);

    // Remove after animation completes
    setTimeout(() => {
      setDanmakuList(prev => prev.filter(d => d.id !== newDanmaku.id));
      processedComments.current.delete(comment.id);
    }, speed * 1000);
  };

  // 初始加载和实时订阅
  useEffect(() => {
    // 获取最近的评论作为初始弹幕
    const fetchInitialComments = async () => {
      try {
        const { data, error } = await supabase.rpc('get_comments', {
          p_target_type: 'global',
          p_target_id: null,
          p_limit: 20
        });

        if (error) throw error;
        if (data) {
          // 随机延迟显示初始弹幕
          data.forEach((comment: Comment, index: number) => {
            setTimeout(() => addDanmaku(comment), index * 500);
          });
        }
      } catch (error) {
        console.error('获取弹幕失败:', error);
      }
    };

    fetchInitialComments();

    // 订阅新评论
    const channel = supabase
      .channel('danmaku-comments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: 'target_type=eq.global'
        },
        async (payload) => {
          console.log('新弹幕:', payload);
          // 获取完整的评论信息（包含用户名）
          const { data, error } = await supabase.rpc('get_comments', {
            p_target_type: 'global',
            p_target_id: null,
            p_limit: 1
          });

          if (!error && data && data.length > 0) {
            addDanmaku(data[0]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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