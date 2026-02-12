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
      
      <div className="px-6 py-16 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Hero Section */}
        <div className="text-center mb-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-black text-foreground/[0.03] select-none pointer-events-none tracking-tighter">
            COMMUNITY
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
            加入 KolArena 官方社区
          </h1>
          <p className="text-base text-muted-foreground/80 max-w-xl mx-auto leading-relaxed">
            连接全球顶级交易高手，获取第一手信号研报，开启属于你的致富之路
          </p>
        </div>

        {/* Community Platforms - Refined Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-20">
          {communities.map((comm) => (
            <div key={comm.id} className="group p-6 rounded-3xl border border-border bg-card/40 hover:border-foreground/20 hover:shadow-xl hover:shadow-foreground/[0.02] transition-all duration-500 flex flex-col items-center">
              {/* Platform Info */}
              <div className="flex items-center justify-between w-full mb-8 bg-muted/10 p-4 rounded-2xl border border-border/40 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: comm.color }}
                  >
                    <comm.icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{comm.name}</h3>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-70 tracking-wider">
                      {comm.handle.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-background/40 text-muted-foreground group-hover:text-foreground transition-all">
                  <QrCode size={18} />
                </div>
              </div>

              {/* QR Code Area - Reduced Size & Refined Style */}
              <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-muted relative group-hover:border-foreground/10 transition-all shadow-inner mb-8">
                <div className="w-full h-full bg-muted/20 flex flex-col items-center justify-center text-muted-foreground font-bold text-center gap-1 rounded-xl">
                  <span className="text-[10px] opacity-40 uppercase tracking-[0.2em]">{comm.name}</span>
                  <span className="text-[10px] font-normal opacity-60">二维码生成中...</span>
                  <div className="absolute inset-4 border border-dashed border-muted/50 flex items-center justify-center bg-white/40 rounded-lg">
                     <span className="text-[10px] text-muted-foreground/20 tracking-widest uppercase">official qr</span>
                  </div>
                </div>
              </div>
              
              <div className="w-full space-y-4 px-2">
                <Button 
                  variant="outline"
                  className="w-full py-5 text-sm font-semibold border border-foreground/10 transition-all hover:bg-foreground hover:text-background rounded-xl"
                  onClick={() => comm.url !== '#' && window.open(comm.url, '_blank')}
                >
                  跳转到聊天端
                </Button>
                <div className="flex items-center justify-center gap-2 opacity-50">
                   <div className="h-[1px] w-8 bg-muted-foreground/30"></div>
                   <p className="text-[10px] text-muted-foreground tracking-wide uppercase">
                     JOIN THE CIRCLE
                   </p>
                   <div className="h-[1px] w-8 bg-muted-foreground/30"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Advantage & Invite Section - Refined */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {advantages.map((adv, i) => (
              <div key={i} className="p-5 rounded-2xl border border-border/60 bg-card/30 hover:bg-card hover:border-border transition-all flex flex-col gap-3 group">
                <div className="w-9 h-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center group-hover:scale-110 group-hover:bg-foreground/10 transition-all duration-300">
                  <adv.icon className="w-4 h-4 text-foreground/70 group-hover:text-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground tracking-tight">{adv.title}</h3>
                <p className="text-[13px] text-muted-foreground/80 leading-relaxed font-normal">{adv.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-8 rounded-3xl border border-foreground/10 bg-foreground/[0.02] flex flex-col items-center justify-center text-center relative overflow-hidden group backdrop-blur-sm">
            <div className="absolute -top-4 -right-4 p-4 transform rotate-12 opacity-5">
              <Star className="w-20 h-20 text-foreground" />
            </div>
            
            <h3 className="text-sm font-bold mb-6 text-muted-foreground/60 tracking-widest uppercase">
              Exclusive Referral
            </h3>
            <div className="w-full bg-background/50 border border-dashed border-foreground/20 px-6 py-5 rounded-2xl text-2xl font-bold tracking-[0.3em] mb-8 text-foreground shadow-inner">
              {invitationCode}
            </div>
            <Button 
              className="w-full gap-2 bg-foreground hover:bg-foreground/90 text-background font-bold py-5 rounded-xl transition-transform active:scale-[0.98]"
              onClick={handleCopyCode}
            >
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "已复制" : "复制邀请码"}
            </Button>
            <p className="text-[10px] text-muted-foreground/50 mt-6 font-medium tracking-wide uppercase">
              UNLOCK PREMIUM BENEFITS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;
