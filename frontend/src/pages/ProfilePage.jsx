import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Avatar from '../components/common/Avatar';
import { roleConfig, sectionConfig, formatDate, errorMessage } from '../utils/helpers';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ phone: user?.phone || '', position: user?.position || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [showPassSection, setShowPassSection] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      const res = await api.put('/auth/profile', form);
      updateUser(res.data);
      setEditMode(false);
      setMsg('Profile updated successfully');
    } catch (err) { setMsg(errorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) { setPassMsg('Passwords do not match'); return; }
    if (passForm.newPassword.length < 6) { setPassMsg('Password must be at least 6 characters'); return; }
    setChangingPass(true); setPassMsg('');
    try {
      await api.put('/auth/change-password', { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      setPassMsg('Password changed successfully');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPassSection(false);
    } catch (err) { setPassMsg(errorMessage(err)); }
    finally { setChangingPass(false); }
  };

  const rc = roleConfig[user?.role];
  const sc = sectionConfig[user?.section];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Profile Card */}
      <div className="card p-6">
        <div className="flex items-start gap-5 mb-6">
          <Avatar name={user?.name} size="xl" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-500">{user?.position || 'No position set'}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
            <div className="flex gap-2 mt-2">
              {rc && <span className={`badge ${rc.color}`}>{rc.label}</span>}
              {sc && <span className={`badge ${sc.color}`}>{sc.label}</span>}
            </div>
          </div>
          <button onClick={() => { setEditMode(!editMode); setMsg(''); }} className="btn-outline text-sm">
            {editMode ? 'Cancel' : '✏️ Edit'}
          </button>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>
        )}

        {editMode ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="label">Position / Title</label>
              <input className="input" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="Your position" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1234567890" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditMode(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400 text-xs mb-1">Department</div>
              <div className="font-medium text-gray-900">{user?.department_name || '—'}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Phone</div>
              <div className="font-medium text-gray-900">{user?.phone || '—'}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Member Since</div>
              <div className="font-medium text-gray-900">{formatDate(user?.created_at)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Section</div>
              <div className="font-medium text-gray-900 capitalize">{user?.section || '—'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Security</h3>
            <p className="text-gray-400 text-sm">Change your password</p>
          </div>
          <button onClick={() => { setShowPassSection(!showPassSection); setPassMsg(''); }} className="btn-outline text-sm">
            {showPassSection ? 'Cancel' : '🔐 Change Password'}
          </button>
        </div>

        {passMsg && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${passMsg.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{passMsg}</div>
        )}

        {showPassSection && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input" required value={passForm.currentPassword} onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))} />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" required minLength={6} value={passForm.newPassword} onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))} />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" required value={passForm.confirmPassword} onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            </div>
            <button type="submit" disabled={changingPass} className="btn-primary">{changingPass ? 'Changing...' : 'Update Password'}</button>
          </form>
        )}
      </div>

      {/* Sign out */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 mb-1">Session</h3>
        <p className="text-gray-400 text-sm mb-4">Sign out of your account on this device</p>
        <button onClick={logout} className="btn-danger">🚪 Sign Out</button>
      </div>
    </div>
  );
}
