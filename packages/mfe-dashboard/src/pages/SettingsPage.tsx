import { useState, type FormEvent } from 'react';
import {
  Button,
  Card,
  Checkbox,
  DIFFICULTY_LEVELS,
  DURATIONS,
  EXPERIENCE_LEVELS,
  QUESTION_COUNTS,
  QUESTION_TYPES,
  Radio,
  SelectField,
  TECHNOLOGIES,
  getSettings,
  saveSettings,
  toast,
  useAuth,
  type AiVoice,
  type UserSettings,
} from '@aip/shared';
import '../styles/dashboard.css';

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(() => getSettings(user?.id));
  const [saving, setSaving] = useState(false);

  const setDefault = <K extends keyof UserSettings['defaults']>(key: K, value: UserSettings['defaults'][K]) => {
    setSettings((prev) => ({ ...prev, defaults: { ...prev.defaults, [key]: value } }));
  };

  const handleSave = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    saveSettings(user.id, settings);
    toast('Settings saved — new interviews will use these defaults.', 'success');
    setSaving(false);
  };

  return (
    <div className="page dashboard">
      <header className="dashboard__header">
        <div>
          <h1 className="page__title">Settings</h1>
          <p className="page__subtitle">Notification preferences and your interview defaults.</p>
        </div>
      </header>

      <form onSubmit={handleSave} className="settings-stack">
        <Card>
          <h2 className="section-title">Notifications</h2>
          <div className="settings-checks">
            <Checkbox
              label="Email me when an interview is evaluated"
              checked={settings.emailNotifications}
              onChange={(e) => setSettings((prev) => ({ ...prev, emailNotifications: e.target.checked }))}
            />
            <Checkbox
              label="Remind me about scheduled interviews"
              checked={settings.interviewReminders}
              onChange={(e) => setSettings((prev) => ({ ...prev, interviewReminders: e.target.checked }))}
            />
            <p className="adm-muted">
              Stored as your preference; email delivery arrives with the notification-service email adapter.
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="section-title">Interview Defaults</h2>
          <p className="adm-muted settings-hint">These prefill the Configure Your Interview screen.</p>
          <div className="settings-grid">
            <SelectField
              label="Technology"
              options={TECHNOLOGIES}
              value={settings.defaults.technology}
              onChange={(e) => setDefault('technology', e.target.value)}
            />
            <SelectField
              label="Experience Level"
              options={EXPERIENCE_LEVELS}
              value={settings.defaults.experienceLevel}
              onChange={(e) => setDefault('experienceLevel', e.target.value)}
            />
            <SelectField
              label="Difficulty"
              options={DIFFICULTY_LEVELS}
              value={settings.defaults.difficulty}
              onChange={(e) => setDefault('difficulty', e.target.value)}
            />
            <SelectField
              label="Duration"
              options={DURATIONS}
              value={settings.defaults.duration}
              onChange={(e) => setDefault('duration', e.target.value)}
            />
            <SelectField
              label="Number of Questions"
              options={QUESTION_COUNTS}
              value={settings.defaults.questionCount}
              onChange={(e) => setDefault('questionCount', e.target.value)}
            />
            <SelectField
              label="Question Type"
              options={QUESTION_TYPES}
              value={settings.defaults.questionType}
              onChange={(e) => setDefault('questionType', e.target.value)}
            />
          </div>
          <div className="settings-devices">
            <fieldset className="option-inline">
              <legend className="field__label">AI Voice</legend>
              <Radio
                name="settings-voice"
                label="Male"
                checked={settings.defaults.aiVoice === 'male'}
                onChange={() => setDefault('aiVoice', 'male' as AiVoice)}
              />
              <Radio
                name="settings-voice"
                label="Female"
                checked={settings.defaults.aiVoice === 'female'}
                onChange={() => setDefault('aiVoice', 'female' as AiVoice)}
              />
            </fieldset>
            <Checkbox
              label="Enable webcam by default"
              checked={settings.defaults.webcamEnabled}
              onChange={(e) => setDefault('webcamEnabled', e.target.checked)}
            />
            <Checkbox
              label="Enable microphone by default"
              checked={settings.defaults.micEnabled}
              onChange={(e) => setDefault('micEnabled', e.target.checked)}
            />
          </div>
        </Card>

        <div>
          <Button type="submit" size="lg" loading={saving}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
