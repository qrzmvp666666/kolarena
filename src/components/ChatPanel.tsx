import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/contexts/UserContext';

interface Comment {
  id: number;
  user_id: string;
  target_type: string;
  target_id: number | null;
  content: string;
  display_time: string;
  created_at: string;
  updated_at: string;
  user_display_name: string;
  user_avatar_url: string | null;
}

interface ChatPanelProps {
  filterModel: string;
}

const ChatPanel = ({ filterModel }: ChatPanelProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

  // 获取评论
  const fetchComments = async () => {
    try {
      console.log('获取评论列表...');
      const { data, error } = await supabase.rpc('get_comments', {
        p_target_type: 'global',
        p_target_id: null,
        p_limit: 100
      });

      console.log('获取评论 - data:', data);
      console.log('获取评论 - error:', error);

      if (error) {
        console.error('获取评论错误:', error);
        throw error;
      }
      if (data) {
        console.log(`成功获取 ${data.length} 条评论`);
        setComments(data);
      }
    } catch (error) {
      console.error('获取评论失败:', error);
    }
  };

  // 创建评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('提交评论 - user:', user);
    console.log('提交评论 - newComment:', newComment);
    
    if (!newComment.trim()) {
      console.warn('评论内容为空');
      return;
    }
    
    if (!user) {
      console.warn('用户未登录');
      alert('请先登录');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('调用 create_comment RPC...');
      const { data, error } = await supabase.rpc('create_comment', {
        p_target_type: 'global',
        p_target_id: null,
        p_content: newComment.trim(),
        p_display_time: new Date().toISOString()
      });

      console.log('RPC 响应 - data:', data);
      console.log('RPC 响应 - error:', error);

      if (error) {
        console.error('RPC 错误详情:', error);
        alert(`创建评论失败: ${error.message}`);
        throw error;
      }
      
      console.log('评论创建成功！');
      setNewComment('');
      // 新评论会通过 Realtime 自动添加
    } catch (error) {
      console.error('创建评论失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 初始化加载和实时订阅
  useEffect(() => {
    fetchComments();

    // 订阅评论表的变化
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: 'target_type=eq.global'
        },
        (payload) => {
          console.log('评论变化:', payload);
          // 重新获取评论列表
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 获取用户头像或默认表情
  const getUserIcon = (avatarUrl: string | null) => {
    if (avatarUrl) {
      return <img src={avatarUrl} alt="avatar" className="w-6 h-6 rounded-full" />;
    }
    return '👤';
  };

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-1" ref={scrollRef}>
          {comments.map((comment) => (
            <div 
              key={comment.id} 
              className="border-l-2 border-cyan-500 pl-3 py-2"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>{getUserIcon(comment.user_avatar_url)}</span>
                  <span className="font-mono text-xs font-semibold text-cyan-500">
                    {comment.user_display_name}
                  </span>
                </div>
                <span className="text-muted-foreground font-mono text-xs">
                  {formatTime(comment.created_at)}
                </span>
              </div>
              <p className="text-foreground text-sm leading-relaxed font-mono">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* 发送评论表单 */}
      <div className="border-t p-3 space-y-2">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={user ? "写下你的评论..." : "请先登录..."}
            className="min-h-[60px] resize-none font-mono text-sm"
            disabled={!user || isSubmitting}
          />
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="sm"
              disabled={!user || !newComment.trim() || isSubmitting}
            >
              {isSubmitting ? '发送中...' : '发送'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
