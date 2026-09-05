import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserCircle, Save, Shield, Settings, Key, Phone, Mail, MapPin,
  Calendar, Heart, CreditCard,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores';
import { Sidebar, Header, Button, Card, Input, Select, LoadingSpinner } from '../../components/shared';
import { useToastStore } from '../../components/shared/Toast';
import DataDeletionRequest from '../../components/advanced/DataDeletionRequest';

const NAV_ITEMS = [
  { icon: <UserCircle size={20} />, label: 'Dashboard', path: '/patient/dashboard' },
  { icon: <UserCircle size={20} />, label: 'Book OPD', path: '/patient/book-opd' },
  { icon: <UserCircle size={20} />, label: 'My Visits', path: '/patient/visits' },
  { icon: <UserCircle size={20} />, label: 'Health Timeline', path: '/patient/health-timeline' },
  { icon: <UserCircle size={20} />, label: 'Documents', path: '/patient/documents' },
  { icon: <UserCircle size={20} />, label: 'Profile', path: '/patient/profile' },
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const BLOOD_GROUP_OPTIONS = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

interface ProfileData {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  abha_id: string | null;
  blood_group?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const addToast = useToastStore(s => s.addToast);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    abha_id: '',
  });
  const [passwords, setPasswords] = useState({
    new_password: '',
    confirm_password: '',
  });

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      const p = data as ProfileData;
      setProfile(p);
      setForm({
        name: p.name || '',
        email: p.email || '',
        phone: p.phone || '',
        date_of_birth: p.date_of_birth || '',
        gender: p.gender || '',
        blood_group: p.blood_group || '',
        address: p.address || '',
        emergency_contact_name: p.emergency_contact_name || '',
        emergency_contact_phone: p.emergency_contact_phone || '',
        abha_id: p.abha_id || '',
      });
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id, addToast]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleNavigate = (path: string) => navigate(path);
  const handleLogout = () => { logout(); navigate('/'); };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('patients')
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone,
          date_of_birth: form.date_of_birth || null,
          gender: form.gender || null,
          address: form.address || null,
          abha_id: form.abha_id || null,
          blood_group: form.blood_group || null,
          emergency_contact_name: form.emergency_contact_name || null,
          emergency_contact_phone: form.emergency_contact_phone || null,
        })
        .eq('id', user.id);
      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...form } : prev);
      addToast('success', 'Profile updated successfully');
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwords.new_password.length < 6) {
      addToast('warning', 'Password must be at least 6 characters');
      return;
    }
    if (passwords.new_password !== passwords.confirm_password) {
      addToast('warning', 'Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new_password,
      });
      if (error) throw error;
      addToast('success', 'Password changed successfully');
      setPasswords({ new_password: '', confirm_password: '' });
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = () => {
    const name = form.name || profile?.name || 'P';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        items={NAV_ITEMS}
        currentPath="/patient/profile"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={{ name: form.name || 'Patient', role: 'Patient' }}
      />
      <div className="lg:ml-64 min-h-screen flex flex-col">
        <Header
          title="My Profile"
          subtitle="Manage your personal information"
          onMenuToggle={() => {}}
          user={{ name: form.name || 'Patient', role: 'Patient' }}
        />
        <main className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
          <motion.div {...fadeUp}>
            <Card>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                  <span className="text-2xl font-bold text-primary-700">{getInitials()}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-surface-900">{form.name || 'Patient'}</h2>
                  <p className="text-sm text-surface-500">{form.email || 'No email set'}</p>
                  {form.phone && (
                    <p className="text-sm text-surface-400 flex items-center gap-1 mt-0.5">
                      <Phone size={13} /> {form.phone}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <Card>
              <div className="flex items-center gap-2 mb-5">
                <UserCircle size={20} className="text-primary-600" />
                <h3 className="text-lg font-semibold text-surface-900">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Enter your full name"
                  icon={<UserCircle size={16} />}
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="Enter your email"
                  icon={<Mail size={16} />}
                />
                <Input
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => updateField('phone', e.target.value)}
                  placeholder="Enter your phone number"
                  icon={<Phone size={16} />}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={form.date_of_birth}
                  onChange={e => updateField('date_of_birth', e.target.value)}
                  icon={<Calendar size={16} />}
                />
                <Select
                  label="Gender"
                  options={GENDER_OPTIONS}
                  value={form.gender}
                  onChange={v => updateField('gender', v)}
                  placeholder="Select gender"
                />
                <Select
                  label="Blood Group"
                  options={BLOOD_GROUP_OPTIONS}
                  value={form.blood_group}
                  onChange={v => updateField('blood_group', v)}
                  placeholder="Select blood group"
                />
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-surface-700 mb-1">Address</label>
                  <textarea
                    value={form.address}
                    onChange={e => updateField('address', e.target.value)}
                    rows={2}
                    placeholder="Enter your address"
                    className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
            <Card>
              <div className="flex items-center gap-2 mb-5">
                <Heart size={20} className="text-danger-500" />
                <h3 className="text-lg font-semibold text-surface-900">Emergency Contact</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Emergency Contact Name"
                  value={form.emergency_contact_name}
                  onChange={e => updateField('emergency_contact_name', e.target.value)}
                  placeholder="Contact person's name"
                  icon={<UserCircle size={16} />}
                />
                <Input
                  label="Emergency Contact Phone"
                  type="tel"
                  value={form.emergency_contact_phone}
                  onChange={e => updateField('emergency_contact_phone', e.target.value)}
                  placeholder="Contact person's phone"
                  icon={<Phone size={16} />}
                />
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
            <Card>
              <div className="flex items-center gap-2 mb-5">
                <CreditCard size={20} className="text-secondary-600" />
                <h3 className="text-lg font-semibold text-surface-900">ABHA ID</h3>
              </div>
              <Input
                label="ABHA ID (Optional)"
                value={form.abha_id}
                onChange={e => updateField('abha_id', e.target.value)}
                placeholder="Enter your ABHA ID"
                icon={<CreditCard size={16} />}
              />
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.35 }}>
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="lg"
                icon={<Save size={18} />}
                onClick={handleSave}
                loading={saving}
              >
                Save Profile
              </Button>
            </div>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.4 }}>
            <Card>
              <div className="flex items-center gap-2 mb-5">
                <Key size={20} className="text-warning-600" />
                <h3 className="text-lg font-semibold text-surface-900">Change Password</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="New Password"
                  type="password"
                  value={passwords.new_password}
                  onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))}
                  placeholder="At least 6 characters"
                  icon={<Key size={16} />}
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  value={passwords.confirm_password}
                  onChange={e => setPasswords(p => ({ ...p, confirm_password: e.target.value }))}
                  placeholder="Re-enter password"
                  icon={<Key size={16} />}
                />
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={handleChangePassword}
                  loading={changingPassword}
                  disabled={!passwords.new_password || !passwords.confirm_password}
                  icon={<Key size={16} />}
                >
                  Update Password
                </Button>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.5 }}>
            <Card>
              <div className="flex items-center gap-2 mb-5">
                <Settings size={20} className="text-surface-500" />
                <h3 className="text-lg font-semibold text-surface-900">Account Settings</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-surface-900">Email Notifications</p>
                    <p className="text-xs text-surface-500">Receive appointment reminders via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-300 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-surface-900">SMS Notifications</p>
                    <p className="text-xs text-surface-500">Receive appointment reminders via SMS</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-surface-300 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
                  </label>
                </div>
                <div className="pt-3 border-t border-surface-200">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to log out?')) {
                        logout();
                        navigate('/');
                      }
                    }}
                    icon={<Shield size={16} />}
                  >
                    Log Out
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.6 }}>
            <DataDeletionRequest />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
