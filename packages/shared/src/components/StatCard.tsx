import { Icon, type IconName } from './Icon';

export interface StatCardProps {
  title: string;
  value: string;
  icon: IconName;
  iconTone: 'blue' | 'green' | 'purple' | 'orange';
  linkLabel?: string;
  onLinkClick?: () => void;
}

export function StatCard({ title, value, icon, iconTone, linkLabel, onLinkClick }: StatCardProps) {
  return (
    <div className="card card--pad-md stat-card">
      <div className="stat-card__top">
        <span className="stat-card__title">{title}</span>
        <span className={`stat-card__icon stat-card__icon--${iconTone}`}>
          <Icon name={icon} size={18} />
        </span>
      </div>
      <div className="stat-card__value">{value}</div>
      {linkLabel && (
        <button type="button" className="stat-card__link" onClick={onLinkClick}>
          {linkLabel}
        </button>
      )}
    </div>
  );
}
