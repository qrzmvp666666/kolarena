import TopNav from '@/components/TopNav';
import TickerBar from '@/components/TickerBar';
import { useLanguage } from '@/lib/i18n';
import { Send, MessageCircle, QrCode, Users, Landmark, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Community = () => {
  const { t } = useLanguage();
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
    {
      id: 'qq',
      name: 'QQ',
      handle: 'KolArena QQ群',
      icon: Users,
      color: '#12B7F5',
      qrText: '扫码加入 QQ 群',
      url: '#'
    },
  ];

  const exchanges = [
    {
      id: 'binance',
      name: 'Binance',
      tag: '合约返佣 40%',
      desc: '专属渠道注册；合约手续费长期 40% 返佣。当月合约交易量达 5000U，解锁当月 Pro 会员。',
      url: '#',
      color: '#F3BA2F'
    },
    {
      id: 'okx',
      name: 'OKX',
      tag: '高返佣专属通道',
      desc: '合约手续费 40% 返佣，适用全品类合约。当月合约交易量达 5000U，赠送当月 Pro 会员。',
      url: '#',
      color: '#111111'
    },
    {
      id: 'bybit',
      name: 'Bybit',
      tag: '合约返佣 40%',
      desc: '使用专属注册链接，享长期返佣权益。当月合约交易量达 5000U，即可领取当月 Pro。',
      url: '#',
      color: '#F59E0B'
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-mono relative">
      {/* Top Navigation */}
      <TopNav danmakuEnabled={false} onToggleDanmaku={() => {}} hideDanmakuToggle />
      
      {/* Ticker Bar */}
      <TickerBar />
      
      <div className="px-6 py-10 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Hero Section */}
        <div className="text-center mb-12 relative">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {communities.map((comm) => (
            <div key={comm.id} className="group p-5 rounded-3xl border border-border bg-card/40 hover:border-foreground/20 hover:shadow-xl hover:shadow-foreground/[0.02] transition-all duration-500 flex flex-col items-center">
              {/* Platform Info */}
              <div className="flex items-center justify-between w-full mb-6 bg-muted/10 p-4 rounded-2xl border border-border/40 backdrop-blur-sm">
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
              <div className="w-40 h-40 bg-white p-3 rounded-2xl border border-muted relative group-hover:border-foreground/10 transition-all shadow-inner mb-6">
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

        {/* Exchange Registration Cards */}
        <div className="mb-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              交易所注册链接
            </h2>
            <p className="text-sm text-muted-foreground/80 mt-2">
              选择适合你的交易平台，使用专属通道注册
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {exchanges.map((exchange) => (
              <div key={exchange.id} className="group p-6 rounded-3xl border border-border bg-card/30 hover:bg-card hover:border-foreground/20 transition-all duration-500">
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10"
                    style={{ backgroundColor: exchange.color }}
                  >
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{exchange.name}</h3>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-70 tracking-wider">
                      {exchange.tag}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground/80 leading-relaxed mb-6">
                  {exchange.desc}
                </p>

                <Button
                  variant="outline"
                  className="w-full py-5 text-sm font-semibold border border-foreground/10 transition-all hover:bg-foreground hover:text-background rounded-xl gap-2"
                  onClick={() => exchange.url !== '#' && window.open(exchange.url, '_blank')}
                >
                  立即注册
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Community;
