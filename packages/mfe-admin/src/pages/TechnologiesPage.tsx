import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  Badge,
  Button,
  Card,
  Icon,
  Spinner,
  TextField,
  adminApi,
  toast,
  type Technology,
} from '@aip/shared';

/** Admin: manage the technology catalogue used across interviews and candidates. */
export default function TechnologiesPage() {
  const [technologies, setTechnologies] = useState<Technology[] | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setTechnologies(await adminApi.getTechnologies());
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast('Enter a technology name.', 'error');
      return;
    }
    setBusy(true);
    try {
      const created = await adminApi.addTechnology(name);
      toast(`"${created.name}" added.`, 'success');
      setName('');
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to add technology.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Technologies</h1>
          <p className="page__subtitle">Add and manage the technologies available for interviews.</p>
        </div>
      </header>

      <Card>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <TextField
              icon="layers"
              placeholder="e.g. Rust, Go, GraphQL…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="New technology name"
            />
          </div>
          <Button type="submit" icon="plus" loading={busy}>
            Add Technology
          </Button>
        </form>
      </Card>

      {!technologies ? (
        <div className="block-state">
          <Spinner size={28} />
          <p>Loading technologies…</p>
        </div>
      ) : (
        <Card padding="none" className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Technology</th>
                <th aria-label="Status" />
              </tr>
            </thead>
            <tbody>
              {technologies.map((tech) => (
                <tr key={tech.id}>
                  <td className="data-table__strong">
                    <Icon name="layers" size={14} /> {tech.name}
                  </td>
                  <td>
                    <Badge tone="info">Active</Badge>
                  </td>
                </tr>
              ))}
              {technologies.length === 0 && (
                <tr>
                  <td colSpan={2}>
                    <div className="block-state">No technologies yet.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
