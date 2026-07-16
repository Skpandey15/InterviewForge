import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Modal,
  Spinner,
  adminApi,
  toast,
  useAuth,
  type InterviewerRating,
  type User,
  type UserRole,
} from '@aip/shared';

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
          <p className="page__subtitle">Onboarded users — promote a user to interviewer.</p>
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
            <p className="block-state__title">No onboarded users yet</p>
            <p>Users appear here after they register an account themselves.</p>
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
                        <>
                          <Button variant="outline" icon="award" onClick={() => openRate(user)}>
                            Rate
                          </Button>
                          <button
                            type="button"
                            className="adm-link-danger"
                            disabled={busyId === user.id}
                            onClick={() => changeRole(user, 'candidate')}
                          >
                            Revert to Candidate
                          </button>
                        </>
                      ) : (
                        <Button
                          icon="user"
                          loading={busyId === user.id}
                          onClick={() => changeRole(user, 'interviewer')}
                        >
                          Make Interviewer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

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
