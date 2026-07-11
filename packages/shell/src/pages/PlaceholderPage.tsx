import { useNavigate } from 'react-router';
import { Button, Icon, type IconName } from '@aip/shared';

export interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: IconName;
}

/** Stub screen for sections outside the current mockup scope. */
export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  const navigate = useNavigate();
  return (
    <div className="placeholder">
      <span className="placeholder__icon">
        <Icon name={icon} size={30} />
      </span>
      <h1 className="placeholder__title">{title}</h1>
      <p>{description}</p>
      <Button variant="outline" icon="arrow-left" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  );
}
