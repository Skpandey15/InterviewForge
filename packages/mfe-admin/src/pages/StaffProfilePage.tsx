import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, Badge, Button, Card, TextField, api, toast, useAuth } from '@aip/shared';

/**
 * Profile for staff (admin + interviewer) — the candidate portal has its own at
 * /profile. Details come from the live session, so they always reflect the
 * actually signed-in user.
 */
export default function StaffProfilePage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.name ?? '');
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.name ?? '');
    setMobile(user?.mobile ?? '');
  }, [user?.name, user?.mobile]);

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || mobile.trim().replace(/\D/g, '').length < 10) {
      toast('Enter a valid name and mobile number.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile(fullName, mobile);
      toast('Profile updated.', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not update your profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">My Profile</h1>
          <p className="page__subtitle">Your account details.</p>
        </div>
      </header>

      <Card>
        <div className="staff-profile">
          <span className="staff-profile__avatar">{initials}</span>
          <div className="staff-profile__id">
            <strong>{user?.name ?? '—'}</strong>
            <span className="adm-muted">{user?.email ?? '—'}</span>
            <Badge tone={user?.role === 'admin' ? 'info' : 'warning'}>{user?.role ?? 'unknown'}</Badge>
          </div>
        </div>
      </Card>

      <Card>
        <form className="adm-form" onSubmit={save}>
          <TextField label="Full Name" icon="user" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField label="Email Address" icon="mail" value={user?.email ?? ''} disabled readOnly />
          <TextField label="Mobile Number" icon="phone" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Button type="submit" loading={saving}>
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
