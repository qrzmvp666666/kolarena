import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/lib/i18n';
import { Bitcoin, Shield } from 'lucide-react';

interface CryptoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  price: number;
  currency?: string;
  paymentUrl?: string | null;
}

const CryptoPaymentModal = ({ open, onOpenChange, planName, price, currency = 'USDT', paymentUrl }: CryptoPaymentModalProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-2 font-mono">
            <Bitcoin className="w-5 h-5 text-foreground" />
            {t('cryptoPayment')} - {planName}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('payAmount')}: <span className="font-mono font-bold">{price} {currency}</span>
          </p>
        </DialogHeader>
        
        <div className="flex justify-center bg-background">
          {paymentUrl ? (
            <iframe
              src={paymentUrl}
              width="410"
              height="696"
              frameBorder="0"
              scrolling="no"
              style={{ overflowY: 'hidden' }}
              title="Crypto Payment Widget"
            >
              {t('widgetLoadError')}
            </iframe>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              {t('paymentNotAvailable')}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-green-500" />
            {t('securePaymentNote')}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CryptoPaymentModal;
