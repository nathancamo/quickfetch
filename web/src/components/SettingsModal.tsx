import { useState, type FormEvent } from 'react';
import { getBrowserGeminiKey, setBrowserGeminiKey } from '../lib/api';
import type { DeliveryProfile, HealthStatus } from '../types';

interface SettingsModalProps {
  profile: DeliveryProfile;
  health: HealthStatus | null;
  onSave: (patch: Partial<DeliveryProfile>) => Promise<void>;
  onClose: () => void;
}

const MEMBERSHIP_FIELDS: Array<{ key: keyof DeliveryProfile; label: string }> = [
  { key: 'amazonPrime', label: 'Amazon Prime ($0 same-day/next-day)' },
  { key: 'woolworthsUnlimited', label: 'Woolworths Delivery Unlimited ($0 over $50)' },
  { key: 'colesPlus', label: 'Coles Plus ($0 over $50)' },
  { key: 'uberOne', label: 'Uber One ($0 delivery on eligible orders)' },
  { key: 'dashPass', label: 'DoorDash DashPass ($0 delivery on eligible orders)' },
];

export function SettingsModal({ profile, health, onSave, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<DeliveryProfile>(profile);
  const [geminiKey, setGeminiKey] = useState(() => getBrowserGeminiKey());
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setSaving(true);
    try {
      if (health?.staticMode) {
        setBrowserGeminiKey(geminiKey);
      }
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Delivery settings">
      <div className="modal-card">
        <div className="modal-head">
          <h2>Delivery Profile</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          <label className="field">
            <span>Suburb</span>
            <input
              type="text"
              value={draft.suburb}
              onChange={(e) => setDraft({ ...draft, suburb: e.target.value })}
              required
            />
          </label>

          <label className="field">
            <span>Postcode</span>
            <input
              type="text"
              value={draft.postcode}
              onChange={(e) => setDraft({ ...draft, postcode: e.target.value })}
              required
            />
          </label>

          <fieldset className="memberships">
            <legend>Memberships (adjusts delivery fees)</legend>
            {MEMBERSHIP_FIELDS.map(({ key, label }) => (
              <label key={key} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(draft[key])}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          {health?.staticMode ? (
            <label className="field">
              <span>Gemini API Key (optional, saved only in this browser)</span>
              <input
                type="password"
                placeholder="AIza... for live web prices"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
            </label>
          ) : (
            <div className="provider-status">
              <strong>Live Search Providers:</strong>{' '}
              Gemini {health?.providers.gemini ? 'Connected' : 'Not set'} · SerpAPI{' '}
              {health?.providers.serpApi ? 'Connected' : 'Not set'}
            </div>
          )}

          <button type="submit" className="search-btn full-width" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
