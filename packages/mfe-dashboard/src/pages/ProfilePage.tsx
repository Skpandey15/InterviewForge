import { useEffect, useState, type FormEvent } from 'react';
import {
  ApiError,
  Badge,
  Button,
  Card,
  PasswordField,
  TextField,
  api,
  toast,
  useAuth,
} from '@aip/shared';
import '../styles/dashboard.css';

export default function ProfilePage() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [mobile, setMobile] = useState(user?.mobile ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

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

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!fullName.trim() || mobile.trim().replace(/\D/g, '').length < 10) {
      toast('Enter a valid name and mobile number.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await api.updateProfile(fullName, mobile);
      toast('Profile updated.', 'success');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not update your profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      toast('New password needs 8+ characters with letters and numbers.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast('Password changed.', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'Could not change the password.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="page dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="page__title">Profile</h1>
          <p className="page__subtitle">Your personal details and account security.</p>
        </div>
      </header>

      <div className="profile-grid">
        <Card className="profile-card">
          <span className="profile-card__avatar">{initials}</span>
          <h2 className="profile-card__name">{user?.name}</h2>
          <p className="adm-muted">{user?.email}</p>
          <Badge tone={user?.role === 'admin' ? 'warning' : 'info'}>
            {user?.role === 'admin' ? 'Administrator' : 'Candidate'}
          </Badge>
        </Card>

        <Card>
          <h2 className="section-title">Personal Information</h2>
          <form className="profile-form" onSubmit={saveProfile}>
            <TextField
              label="Full Name"
              icon="user"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <TextField label="Email Address" icon="mail" value={user?.email ?? ''} disabled
              hint="Email is your login and cannot be changed." />
            <TextField
              label="Mobile Number"
              icon="phone"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
            />
            <Button type="submit" loading={savingProfile}>
              Save Changes
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="section-title">Change Password</h2>
          <form className="profile-form" onSubmit={savePassword}>
            <PasswordField
              label="Current Password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <PasswordField
              label="New Password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint="At least 8 characters with letters and numbers."
            />
            <PasswordField
              label="Confirm New Password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" variant="outline" loading={savingPassword}>
              Change Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
