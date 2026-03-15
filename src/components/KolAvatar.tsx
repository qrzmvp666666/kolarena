import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export const resolveKolAvatar = (avatarUrl?: string | null, name?: string) => {
  const trimmed = avatarUrl?.trim();
  if (trimmed) return trimmed;

  const seed = encodeURIComponent((name || 'KOL').trim() || 'KOL');
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

interface KolAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}

const KolAvatar = ({ name, avatarUrl, className, fallbackClassName }: KolAvatarProps) => {
  const displayName = (name || 'KOL').trim() || 'KOL';

  return (
    <Avatar className={className}>
      <AvatarImage src={resolveKolAvatar(avatarUrl, displayName)} alt={displayName} />
      <AvatarFallback className={cn('text-[10px]', fallbackClassName)}>
        {displayName.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  );
};

export default KolAvatar;
