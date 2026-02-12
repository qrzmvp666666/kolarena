import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { Send, MessageCircle, QrCode, Copy, CheckCircle2, Zap, Trophy, Users, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

const Community = () => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const invitationCode = "KOL888";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(invitationCode);
    setCopied(true);
    toast.success("邀请码已复制");
    setTimeout(() => setCopied(false), 2000);
  };

  const advantages = [
    {
      icon: Zap,
      title: "实时预警",
      desc: "毫秒级信号推送，绝不错过任何入场机会"
    },
    {
      icon: Trophy,
      title: "大咖领航",
      desc: "汇聚顶级交易员，实时分享私藏策略"
    },
    {
      icon: Users,
      title: "深度研报",
      desc: "每日市场趋势剖析，助力科学决策"
    },
    {
      icon: Star,
      title: "资源共享",
      desc: "独家工具、内测名额及社区专属激励"
    }
  ];

  const communities = [
    {
      id: 'telegram',
      name: 'Telegram',
      handle: '@KolArena_Official',
      icon: Send,
      color: '#0088cc',
      qrText: '扫码加入 TG 群组',
      url: 'https://t.me/KolArena_Official'
    },
    {
      id: 'discord',
      name: 'Discord',
      handle: 'KolArena Community',
      icon: MessageCircle,
      color: '#5865F2',
      qrText: '扫码加入 Discord',
      url: '#'
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      <div className="px-6 py-12 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            加入 KolArena 官方社区
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            连接全球顶级交易高手，获取第一手信号研报，开启属于你的致富之路
          </p>
        </div>

        {/* Community Platforms - Moved to Top */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {communities.map((comm) => (
            <div key={comm.id} className="group p-8 rounded-2xl border border-border bg-card hover:border-accent-orange hover:shadow-2xl hover:shadow-accent-orange/5 transition-all duration-300 flex flex-col items-center">
              {/* Platform Info - Now at the top of the card */}
              <div className="flex items-center justify-between w-full mb-6 bg-muted/20 p-4 rounded-xl border border-border/50">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: comm.color }}
                  >
                    <comm.icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{comm.name}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{comm.handle}</p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-background/50 text-muted-foreground group-hover:text-accent-orange group-hover:bg-accent-orange/10 transition-colors">
                  <QrCode size={20} />
                </div>
              </div>

              {/* QR Code Area */}
              <div className="w-56 h-56 bg-white p-4 rounded-2xl border-2 border-muted relative group-hover:border-accent-orange/30 transition-colors shadow-inner mb-8">
                <div className="w-full h-full bg-muted/30 flex flex-col items-center justify-center text-muted-foreground font-bold text-center gap-2">
                  <span className="text-sm opacity-50 uppercase tracking-widest">{comm.name}</span>
                  <span className="text-xs font-normal">二维码生成中...</span>
                  <div className="absolute inset-4 border border-dashed border-muted flex items-center justify-center bg-white/50">
                     <span className="text-muted-foreground/30">{comm.name} QR</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full space-y-3">
                <Button 
                  variant="outline"
                  className="w-full py-6 text-lg font-bold border-2 transition-all hover:bg-muted"
                  onClick={() => comm.url !== '#' && window.open(comm.url, '_blank')}
                >
                  跳转到聊天端
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  加入即代表您同意遵守《KolArena 社区准则》
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Advantage & Invite Section - Moved to Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {advantages.map((adv, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card/50 hover:bg-card transition-colors flex flex-col gap-3 group">
                <div className="w-12 h-12 rounded-full bg-accent-orange/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <adv.icon className="w-6 h-6 text-accent-orange" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{adv.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{adv.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-xl border-2 border-accent-orange bg-accent-orange/5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 transform rotate-12 translate-x-1 -translate-y-1">
              <Star className="w-12 h-12 text-accent-orange/20" />
            </div>
            
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              专属邀请码
            </h3>
            <div className="w-full bg-background border-2 border-dashed border-accent-orange/30 px-6 py-4 rounded-lg text-3xl font-bold tracking-widest mb-6 text-accent-orange">
              {invitationCode}
            </div>
            <Button 
              className="w-full gap-2 bg-accent-orange hover:bg-accent-orange/90 text-white font-bold py-6"
              onClick={handleCopyCode}
            >
              {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copied ? "已复制" : "复制邀请码"}
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              使用此码在社群内或注册时激活豪华新手权益包
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
