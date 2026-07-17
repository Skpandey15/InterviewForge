import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  Icon,
  Modal,
  PasswordField,
  SelectField,
  Spinner,
  TextField,
  adminApi,
  toast,
  useAuth,
  type InterviewerRating,
  type User,
  type UserRole,
} from '@aip/shared';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'candidate', label: 'Candidate' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'admin', label: 'Admin' },
];

const EMPTY_FORM = { name: '', email: '', mobile: '', password: '', role: 'candidate' as UserRole };

function roleTone(role: UserRole): 'info' | 'warning' | 'neutral' {
  if (role === 'interviewer') return 'warning';
  if (role === 'admin') return 'info';
  return 'neutral';
}

/**
 * Admin: the onboarded-user pool. Interviewers are made here — an admin
 * promotes a user who registered themselves. The new role applies at their
 * next sign-in (the role is stamped into the session at login).
 */
export default function UsersPage() {
  const { user: admin } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [ratings, setRatings] = useState<InterviewerRating[]>([]);
  const [busyId, setBusyId] = useState('');

  // Rate-interviewer modal.
  const [rateTarget, setRateTarget] = useState<User | null>(null);
  const [stars, setStars] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Add / edit / delete user.
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const field = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const reload = useCallback(async () => {
    const [list, rated] = await Promise.all([adminApi.getOnboardedUsers(), adminApi.getInterviewerRatings()]);
    setUsers(list);
    setRatings(rated);
  }, []);

  const ratingFor = (userId: string): InterviewerRating | undefined =>
    ratings.find((r) => r.interviewerId === userId);

  const openRate = (user: User) => {
    const existing = ratingFor(user.id);
    setStars(existing?.rating ?? 3);
    setNotes(existing?.notes ?? '');
    setRateTarget(user);
  };

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await adminApi.createUser(form);
      toast(`${form.name.trim()} added as ${form.role}.`, 'success');
      setAddOpen(false);
      setForm(EMPTY_FORM);
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not add the user.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user: User) => {
    setForm({ name: user.name, email: user.email, mobile: user.mobile ?? '', password: '', role: user.role });
    setEditTarget(user);
  };

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    try {
      await adminApi.updateUser(editTarget.id, {
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        role: form.role,
      });
      toast(`${form.name.trim()} updated.`, 'success');
      setEditTarget(null);
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update the user.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      toast(`${deleteTarget.name} removed.`, 'info');
      setDeleteTarget(null);
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not remove the user.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveRating = async () => {
    if (!rateTarget) return;
    setSaving(true);
    try {
      await adminApi.rateInterviewer(rateTarget.id, stars, notes, admin?.name ?? 'Admin');
      toast(`Rated ${rateTarget.name} ${stars}/5.`, 'success');
      setRateTarget(null);
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not save the rating.', 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [reload]);

  const changeRole = async (user: User, role: UserRole) => {
    setBusyId(user.id);
    try {
      await adminApi.setUserRole(user.id, role);
      toast(
        role === 'interviewer'
          ? `${user.name} is now an interviewer — it applies at their next sign-in.`
          : `${user.name} is back to candidate.`,
        'success',
      );
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not change the role.', 'error');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Users</h1>
          <p className="page__subtitle">
            Everyone who registered themselves or was added here — manage roles and accounts.
          </p>
        </div>
        <div className="adm-page__actions">
          <Button
            icon="plus"
            onClick={() => {
              setForm(EMPTY_FORM);
              setAddOpen(true);
            }}
          >
            Add User
          </Button>
        </div>
      </header>

      {!users ? (
        <div className="block-state">
          <Spinner size={28} />
          <p>Loading users…</p>
        </div>
      ) : users.length === 0 ? (
        <Card>
          <div className="block-state">
            <p className="block-state__title">No users yet</p>
            <p>Users appear here when they register themselves, or when you add one.</p>
          </div>
        </Card>
      ) : (
        <Card padding="none" className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Mobile</th>
                <th>Role</th>
                <th>Performance</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="data-table__strong">{user.name}</div>
                    <div className="adm-muted">{user.email}</div>
                  </td>
                  <td>{user.mobile ?? <span className="adm-muted">—</span>}</td>
                  <td>
                    <Badge tone={roleTone(user.role)}>{user.role}</Badge>
                  </td>
                  <td>
                    {user.role !== 'interviewer' ? (
                      <span className="adm-muted">—</span>
                    ) : ratingFor(user.id) ? (
                      <span title={ratingFor(user.id)?.notes}>
                        {'★'.repeat(ratingFor(user.id)!.rating)}
                        <span className="adm-muted">{'★'.repeat(5 - ratingFor(user.id)!.rating)}</span>
                      </span>
                    ) : (
                      <span className="adm-muted">Not rated</span>
                    )}
                  </td>
                  <td>
                    <div className="adm-row-actions">
                      {user.role === 'interviewer' ? (
                        <button type="button" className="data-table__view" onClick={() => openRate(user)}>
                          <Icon name="award" size={12} /> Rate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="data-table__view"
                          disabled={busyId === user.id}
                          onClick={() => changeRole(user, 'interviewer')}
                        >
                          <Icon name="user" size={12} /> Make Interviewer
                        </button>
                      )}
                      {user.role === 'interviewer' && (
                        <button
                          type="button"
                          className="data-table__view"
                          disabled={busyId === user.id}
                          onClick={() => changeRole(user, 'candidate')}
                        >
                          <Icon name="refresh" size={12} /> To Candidate
                        </button>
                      )}
                      <button type="button" className="data-table__view" onClick={() => openEdit(user)}>
                        <Icon name="edit" size={12} /> Edit
                      </button>
                      <button type="button" className="adm-link-danger" onClick={() => setDeleteTarget(user)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal title="Add User" open={addOpen} onClose={() => setAddOpen(false)}>
        <form className="adm-form" onSubmit={handleAdd}>
          <TextField
            label="Full Name"
            icon="user"
            placeholder="Jane Doe"
            value={form.name}
            onChange={(e) => field('name')(e.target.value)}
          />
          <TextField
            label="Email Address"
            icon="mail"
            type="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => field('email')(e.target.value)}
          />
          <TextField
            label="Mobile Number"
            icon="phone"
            placeholder="9876500000"
            value={form.mobile}
            onChange={(e) => field('mobile')(e.target.value)}
          />
          <PasswordField
            label="Temporary Password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => field('password')(e.target.value)}
          />
          <SelectField
            label="Role"
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => field('role')(e.target.value)}
          />
          <Button type="submit" block loading={saving}>
            Add User
          </Button>
        </form>
      </Modal>

      <Modal
        title={`Edit User — ${editTarget?.name ?? ''}`}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
      >
        <form className="adm-form" onSubmit={handleEdit}>
          <TextField
            label="Full Name"
            icon="user"
            value={form.name}
            onChange={(e) => field('name')(e.target.value)}
          />
          <TextField
            label="Email Address"
            icon="mail"
            type="email"
            value={form.email}
            onChange={(e) => field('email')(e.target.value)}
          />
          <TextField
            label="Mobile Number"
            icon="phone"
            value={form.mobile}
            onChange={(e) => field('mobile')(e.target.value)}
          />
          <SelectField
            label="Role"
            options={ROLE_OPTIONS}
            value={form.role}
            onChange={(e) => field('role')(e.target.value)}
          />
          <Button type="submit" block loading={saving}>
            Save Changes
          </Button>
        </form>
      </Modal>

      <Modal
        title={`Delete ${deleteTarget?.name ?? 'user'}?`}
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
      >
        <div className="adm-form">
          <p>
            This removes <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) and they will no longer be
            able to sign in. This cannot be undone.
          </p>
          <div className="rsm__actions">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={saving} onClick={handleDelete}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        title={`Rate Interviewer — ${rateTarget?.name ?? ''}`}
        open={rateTarget !== null}
        onClose={() => setRateTarget(null)}
      >
        <div className="adm-form">
          <div className="adm-field">
            <span>Performance rating</span>
            <div className="rate-stars" role="group" aria-label="Rating out of 5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`rate-stars__btn ${n <= stars ? 'rate-stars__btn--on' : ''}`}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                  aria-pressed={n === stars}
                  onClick={() => setStars(n)}
                >
                  ★
                </button>
              ))}
              <span className="adm-muted">{stars}/5</span>
            </div>
          </div>
          <label className="adm-field">
            <span>Notes</span>
            <textarea
              className="adm-textarea"
              rows={4}
              placeholder="Feedback quality, turnaround, candidate experience…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <Button block loading={saving} onClick={saveRating}>
            Save Rating
          </Button>
        </div>
      </Modal>
    </div>
  );
}
