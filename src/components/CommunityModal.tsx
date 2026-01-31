import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/lib/i18n';
import { MessageCircle, Send } from 'lucide-react';

interface CommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const communities = [
  {
    id: 'telegram',
    name: 'Telegram',
    handle: '@KolArena_Official',
    icon: Send,
    color: '#0088cc',
    qrPlaceholder: 'TG',
  },
  {
    id: 'discord',
    name: 'Discord',
    handle: 'KolArena Community',
    icon: MessageCircle,
    color: '#5865F2',
    qrPlaceholder: 'DC',
  },
];

const CommunityModal = ({ open, onOpenChange }: CommunityModalProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-mono">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold">
            {t('joinCommunity')}
          </DialogTitle>
        </DialogHeader>
        
        <p className="text-center text-sm text-muted-foreground mb-6">
          {t('communityDesc')}
        </p>

        <div className="grid grid-cols-2 gap-4">
          {communities.map((community) => {
            const IconComponent = community.icon;
            return (
              <div
                key={community.id}
                className="flex flex-col items-center p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {/* QR Code Placeholder */}
                <div 
                  className="w-24 h-24 rounded-lg flex items-center justify-center mb-3 text-white text-2xl font-bold"
                  style={{ backgroundColor: community.color }}
                >
                  {community.qrPlaceholder}
                </div>
                
                {/* Community Info */}
                <div className="flex items-center gap-2 mb-1">
                  <IconComponent size={16} style={{ color: community.color }} />
                  <span className="font-semibold text-foreground">{community.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{community.handle}</span>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {t('scanToJoin')}
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default CommunityModal;
