import { Icon } from './Icon';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  stacked?: boolean;
}

/** AI Interview Portal brand mark. */
export function Logo({ size = 'md', stacked = false }: LogoProps) {
  const iconSize = size === 'lg' ? 34 : size === 'md' ? 22 : 18;
  return (
    <div className={`logo logo--${size} ${stacked ? 'logo--stacked' : ''}`}>
      <span className="logo__mark">
        <Icon name="message-square" size={iconSize} strokeWidth={2.2} />
      </span>
      <span className="logo__text">
        AI Interview <span className="logo__accent">Portal</span>
      </span>
    </div>
  );
}
