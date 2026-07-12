import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  Badge,
  Button,
  Card,
  Icon,
  Modal,
  SelectField,
  Spinner,
  TECHNOLOGIES,
  TextField,
  adminApi,
  toast,
  useAuth,
  type Candidate,
  type Interviewer,
  type InterviewTemplate,
} from '@aip/shared';

function progressTone(progress: Candidate['progress']): 'success' | 'warning' | 'neutral' {
  if (progress === 'Completed') return 'success';
  if (progress === 'In Progress') return 'warning';
  return 'neutral';
}

/** Tiny CSV parser for "name,email,technology" files (header optional). */
function parseCsv(text: string): Array<{ name: string; email: string; technology: string }> {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2 && cells[1].includes('@'))
    .map(([name, email, technology]) => ({ name, email, technology: technology ?? '' }));
}

export default function CandidatesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [templates, setTemplates] = useState<InterviewTemplate[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Candidate | null>(null);
  const [interviewerTarget, setInterviewerTarget] = useState<Candidate | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTech, setNewTech] = useState(TECHNOLOGIES[0].label);
  const [assignTemplate, setAssignTemplate] = useState('');
  const [pickedInterviewer, setPickedInterviewer] = useState('');

  const [editTarget, setEditTarget] = useState<Candidate | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTech, setEditTech] = useState('');

  const reload = useCallback(async () => {
    const [list, tpls, ints] = await Promise.all([
      adminApi.getCandidates(),
      adminApi.getTemplates(),
      adminApi.getInterviewers(),
    ]);
    setCandidates(list);
    setTemplates(tpls);
    setInterviewers(ints);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!candidates) return null;
    const query = search.trim().toLowerCase();
    if (!query) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.technology.toLowerCase().includes(query),
    );
  }, [candidates, search]);

  const publishedTemplates = templates.filter((t) => t.status === 'Published');

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim() || !newEmail.includes('@')) {
      toast('Enter a valid name and email.', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminApi.addCandidate({ name: newName, email: newEmail, technology: newTech });
      toast(`Candidate "${newName.trim()}" added.`, 'success');
      setAddOpen(false);
      setNewName('');
      setNewEmail('');
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to add candidate.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast('No valid rows found. Expected CSV columns: name, email, technology.', 'error');
      return;
    }
    const imported = await adminApi.importCandidates(rows);
    toast(`${imported} candidate${imported === 1 ? '' : 's'} imported from ${file.name}.`, 'success');
    await reload();
  };

  const handleAssign = async (event: FormEvent) => {
    event.preventDefault();
    if (!assignTarget || !assignTemplate) return;
    setBusy(true);
    try {
      await adminApi.assignInterview(assignTarget.id, assignTemplate);
      toast(`"${assignTemplate}" assigned to ${assignTarget.name}.`, 'success');
      setAssignTarget(null);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleAssignInterviewer = async (event: FormEvent) => {
    event.preventDefault();
    if (!interviewerTarget || !pickedInterviewer) return;
    setBusy(true);
    try {
      await adminApi.assignInterviewer(interviewerTarget.id, pickedInterviewer);
      toast(`${pickedInterviewer} assigned to ${interviewerTarget.name}.`, 'success');
      setInterviewerTarget(null);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (candidate: Candidate) => {
    setEditTarget(candidate);
    setEditName(candidate.name);
    setEditEmail(candidate.email);
    setEditTech(candidate.technology);
  };

  const handleEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    if (!editName.trim() || !editEmail.includes('@')) {
      toast('Enter a valid name and email.', 'error');
      return;
    }
    setBusy(true);
    try {
      await adminApi.updateCandidate(editTarget.id, {
        name: editName,
        email: editEmail,
        technology: editTech,
      });
      toast(`${editName.trim()} updated.`, 'success');
      setEditTarget(null);
      await reload();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to update candidate.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (candidate: Candidate) => {
    const updated = await adminApi.toggleCandidateStatus(candidate.id);
    toast(`${updated.name} is now ${updated.status.toLowerCase()}.`, 'info');
    await reload();
  };

  return (
    <div className="page adm-page">
      <header className="adm-page__header">
        <div>
          <h1 className="page__title">Candidate Management</h1>
          <p className="page__subtitle">Add, import and track candidates through their interviews.</p>
        </div>
        <div className="adm-page__actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={handleImport}
            aria-label="Import candidates CSV"
          />
          <Button variant="outline" icon="upload" onClick={() => fileInputRef.current?.click()}>
            Import CSV
          </Button>
          <Button icon="plus" onClick={() => setAddOpen(true)}>
            Add Candidate
          </Button>
        </div>
      </header>

      <div className="adm-toolbar">
        <TextField
          icon="search"
          placeholder="Search by name, email or technology…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search candidates"
        />
      </div>

      {!filtered ? (
        <div className="block-state">
          <Spinner size={28} />
          <p>Loading candidates…</p>
        </div>
      ) : (
        <Card padding="none" className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Technology</th>
                <th>Assigned Interview</th>
                <th>Interviewer</th>
                <th>Progress</th>
                <th>Score</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((candidate) => (
                <tr key={candidate.id} className={candidate.status === 'Disabled' ? 'adm-row--disabled' : ''}>
                  <td>
                    <div className="data-table__strong">{candidate.name}</div>
                    <div className="adm-muted">{candidate.email}</div>
                  </td>
                  <td>{candidate.technology}</td>
                  <td>{candidate.assignedInterview ?? <span className="adm-muted">Not assigned</span>}</td>
                  <td>{candidate.assignedInterviewer ?? <span className="adm-muted">—</span>}</td>
                  <td>
                    <Badge tone={progressTone(candidate.progress)}>{candidate.progress}</Badge>
                  </td>
                  <td className="data-table__strong">{candidate.score != null ? `${candidate.score}%` : '—'}</td>
                  <td>
                    <Badge tone={candidate.status === 'Active' ? 'info' : 'neutral'}>{candidate.status}</Badge>
                  </td>
                  <td>
                    <div className="adm-row-actions">
                      <button
                        type="button"
                        className="data-table__view"
                        onClick={() => {
                          setAssignTarget(candidate);
                          setAssignTemplate(publishedTemplates[0]?.name ?? '');
                        }}
                      >
                        <Icon name="play" size={12} /> Assign
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="data-table__view"
                          onClick={() => {
                            setInterviewerTarget(candidate);
                            setPickedInterviewer(interviewers[0]?.name ?? '');
                          }}
                        >
                          <Icon name="user" size={12} /> Interviewer
                        </button>
                      )}
                      {isAdmin && (
                        <button type="button" className="data-table__view" onClick={() => openEdit(candidate)}>
                          <Icon name="edit" size={12} /> Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="data-table__view"
                        onClick={() => navigate('/admin/feedback')}
                      >
                        <Icon name="message-square" size={12} /> Feedback
                      </button>
                      <button type="button" className="adm-link-danger" onClick={() => handleToggle(candidate)}>
                        {candidate.status === 'Active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="block-state">No candidates match “{search}”.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Modal title="Add Candidate" open={addOpen} onClose={() => setAddOpen(false)}>
        <form className="adm-form" onSubmit={handleAdd}>
          <TextField label="Full Name" icon="user" placeholder="Candidate name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <TextField label="Email Address" icon="mail" type="email" placeholder="name@company.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <SelectField
            label="Primary Technology"
            options={TECHNOLOGIES.map((t) => ({ value: t.label, label: t.label }))}
            value={newTech}
            onChange={(e) => setNewTech(e.target.value)}
          />
          <Button type="submit" block loading={busy}>
            Add Candidate
          </Button>
        </form>
      </Modal>

      <Modal
        title={`Assign Interview — ${assignTarget?.name ?? ''}`}
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
      >
        {publishedTemplates.length === 0 ? (
          <p>No published interviews yet. Publish one from the Interview Builder first.</p>
        ) : (
          <form className="adm-form" onSubmit={handleAssign}>
            <SelectField
              label="Published Interview"
              options={publishedTemplates.map((t) => ({ value: t.name, label: t.name }))}
              value={assignTemplate}
              onChange={(e) => setAssignTemplate(e.target.value)}
            />
            <Button type="submit" block loading={busy}>
              Assign Interview
            </Button>
          </form>
        )}
      </Modal>

      <Modal
        title={`Assign Interviewer — ${interviewerTarget?.name ?? ''}`}
        open={interviewerTarget !== null}
        onClose={() => setInterviewerTarget(null)}
      >
        {interviewers.length === 0 ? (
          <p>No interviewers available.</p>
        ) : (
          <form className="adm-form" onSubmit={handleAssignInterviewer}>
            <SelectField
              label="Interviewer"
              options={interviewers.map((i) => ({ value: i.name, label: `${i.name} — ${i.expertise}` }))}
              value={pickedInterviewer}
              onChange={(e) => setPickedInterviewer(e.target.value)}
            />
            <Button type="submit" block loading={busy}>
              Assign Interviewer
            </Button>
          </form>
        )}
      </Modal>

      <Modal
        title={`Edit Candidate — ${editTarget?.name ?? ''}`}
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
      >
        <form className="adm-form" onSubmit={handleEdit}>
          <TextField label="Full Name" icon="user" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <TextField
            label="Email Address"
            icon="mail"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <SelectField
            label="Primary Technology"
            options={[...new Set([editTech, ...TECHNOLOGIES.map((t) => t.label)].filter(Boolean))].map((l) => ({
              value: l,
              label: l,
            }))}
            value={editTech}
            onChange={(e) => setEditTech(e.target.value)}
          />
          <Button type="submit" block loading={busy}>
            Save Changes
          </Button>
        </form>
      </Modal>
    </div>
  );
}
