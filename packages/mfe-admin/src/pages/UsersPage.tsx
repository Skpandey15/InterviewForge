import { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Spinner,
  adminApi,
  toast,
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
  const [users, setUsers] = useState<User[] | null>(null);
  const [busyId, setBusyId] = useState('');

  const reload = useCallback(async () => {
    setUsers(await adminApi.getOnboardedUsers());
  }, []);

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
                    <div className="adm-row-actions">
                      {user.role === 'interviewer' ? (
                        <Button
                          variant="outline"

                          loading={busyId === user.id}
                          onClick={() => changeRole(user, 'candidate')}
                        >
                          Revert to Candidate
                        </Button>
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
    </div>
  );
}
