import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { Bitcoin, Copy, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';

interface CryptoPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planName: string;
  price: number;
  currency?: string;
  orderId?: string;
  providerPaymentId?: string | null;
  providerStatus?: string | null;
  paymentUrl?: string | null;
  payAddress?: string | null;
  payAmount?: number | null;
  payCurrency?: string | null;
}

const CryptoPaymentModal = ({
  open,
  onOpenChange,
  planName,
  price,
  currency = 'USDT',
  orderId,
  providerPaymentId,
  providerStatus,
  paymentUrl,
  payAddress,
  payAmount,
  payCurrency,
}: CryptoPaymentModalProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const normalizedStatus = String(providerStatus || '').toLowerCase();
  const translatedStatus = normalizedStatus
    ? t(`paymentStatus_${normalizedStatus}`)
    : null;

  const handleCopyAddress = async () => {
    if (!payAddress) return;
    await navigator.clipboard.writeText(payAddress);
    toast({
      title: t('redeemSuccess'),
      description: t('paymentAddressCopied'),
    });
  };

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
        
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border space-y-1">
          {orderId && <div>{t('paymentOrderId')}: <span className="font-mono">{orderId}</span></div>}
          {providerPaymentId && <div>{t('paymentProviderId')}: <span className="font-mono">{providerPaymentId}</span></div>}
          {providerStatus && <div>{t('paymentStatusLabel')}: <span className="font-mono">{translatedStatus || providerStatus}</span></div>}
        </div>

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
          ) : payAddress ? (
            <div className="w-full p-4 space-y-3">
              <div className="rounded-md border border-border bg-card p-4 flex flex-col items-center gap-3">
                <p className="text-xs text-muted-foreground">{t('paymentQrCodeHint')}</p>
                <div className="rounded-md bg-white p-3">
                  <QRCodeSVG
                    value={payAddress}
                    size={168}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    includeMargin
                  />
                </div>
              </div>

              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('paymentAddress')}</p>
                <p className="font-mono text-xs break-all">{payAddress}</p>
              </div>

              <div className="rounded-md border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground mb-1">{t('payAmount')}</p>
                <p className="font-mono text-sm">{payAmount ?? '-'} {payCurrency ?? currency}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="w-full" onClick={handleCopyAddress}>
                  <Copy className="w-4 h-4 mr-2" />
                  {t('copyPaymentAddress')}
                </Button>
                <Button 
                  variant="default" 
                  className="w-full" 
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/account?tab=purchases');
                  }}
                >
                  {t('viewPurchaseRecords')}
                </Button>
              </div>

              <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-2">
                <div className="flex items-start gap-1">
                  <Wallet className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>{t('paymentManualTransferHint')}</span>
                </div>
                <div className="flex items-start gap-1 text-primary/80">
                  <span className="w-3 shrink-0 text-center font-bold">ℹ</span>
                  <span>{t('hasPaidPrompt')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">
              {t('paymentNotAvailable')}
            </div>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default CryptoPaymentModal;
