import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  HeartPulse,
  Trash2,
  CalendarDays,
  ClipboardList,
  ListOrdered,
  UserCog,
  Building2,
  Plus,
  Search,
  Edit2,
  Power,
  Star,
  Award,
  Shield,
  Camera,
  Mail,
  Phone,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import {
  Sidebar,
  Header,
  Button,
  Input,
  Card,
  Badge,
  EmptyState,
  LoadingSpinner,
  Modal,
} from '../../components/shared';

interface DoctorRecord {
  id: string;
  full_name: string;
  email: string;
  qualification: string | null;
  specialization: string | null;
  license_number: string | null;
  experience_years: number | null;
  consultation_fee: number | null;
  avatar_url: string | null;
  is_active: boolean;
  rating: number | null;
  hospital_id: string | null;
}

const sidebarItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/hospital/dashboard' },
  { icon: <CalendarDays size={20} />, label: "Today's OPD", path: '/hospital/opd' },
  { icon: <ClipboardList size={20} />, label: 'Triage', path: '/hospital/triage' },
  { icon: <ListOrdered size={20} />, label: 'Queue', path: '/hospital/queue' },
  { icon: <HeartPulse size={20} />, label: 'Vitals & Alarm', path: '/hospital/vitals' },
  { icon: <Trash2 size={20} />, label: 'Data Retention', path: '/hospital/data-retention' },
  { icon: <UserCog size={20} />, label: 'Doctors', path: '/hospital/doctors' },
  { icon: <Building2 size={20} />, label: 'Departments', path: '/hospital/departments' },
];

interface DoctorForm {
  full_name: string;
  email: string;
  password: string;
  qualification: string;
  specialization: string;
  license_number: string;
  experience_years: string;
  consultation_fee: string;
}

const emptyForm: DoctorForm = {
  full_name: '',
  email: '',
  password: '',
  qualification: '',
  specialization: '',
  license_number: '',
  experience_years: '',
  consultation_fee: '',
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

export default function DoctorManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRecord | null>(null);
  const [form, setForm] = useState<DoctorForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DoctorForm, string>>>({});

  const getHospitalId = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase.from('hospitals').select('id').eq('admin_id', user.id).single();
    return data?.id ?? null;
  }, [user]);

  useEffect(() => {
    (async () => {
      const hid = await getHospitalId();
      setHospitalId(hid);
    })();
  }, [getHospitalId]);

  const fetchDoctors = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'doctor')
      .eq('hospital_id', hospitalId)
      .order('full_name', { ascending: true });
    if (data) setDoctors(data as DoctorRecord[]);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    if (hospitalId) fetchDoctors();
  }, [hospitalId, fetchDoctors]);

  const filtered = doctors.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.full_name.toLowerCase().includes(q) ||
      (d.specialization || '').toLowerCase().includes(q) ||
      (d.qualification || '').toLowerCase().includes(q)
    );
  });

  const openAddModal = () => {
    setEditingDoctor(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (doc: DoctorRecord) => {
    setEditingDoctor(doc);
    setForm({
      full_name: doc.full_name,
      email: doc.email,
      password: '',
      qualification: doc.qualification || '',
      specialization: doc.specialization || '',
      license_number: doc.license_number || '',
      experience_years: doc.experience_years?.toString() || '',
      consultation_fee: doc.consultation_fee?.toString() || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof DoctorForm, string>> = {};
    if (!form.full_name.trim()) errors.full_name = 'Name is required';
    if (!editingDoctor && !form.email.trim()) errors.email = 'Email is required';
    if (!editingDoctor && !form.password.trim()) errors.password = 'Password is required';
    if (!editingDoctor && form.password.length < 6) errors.password = 'Min 6 characters';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveDoctor = async () => {
    if (!validate() || !hospitalId) return;
    setSaving(true);

    if (editingDoctor) {
      const updateData: Record<string, unknown> = {
        full_name: form.full_name,
        qualification: form.qualification || null,
        specialization: form.specialization || null,
        license_number: form.license_number || null,
        experience_years: form.experience_years ? parseInt(form.experience_years) : null,
        consultation_fee: form.consultation_fee ? parseFloat(form.consultation_fee) : null,
        updated_at: new Date().toISOString(),
      };
      await supabase.from('profiles').update(updateData).eq('id', editingDoctor.id);
    } else {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name, role: 'doctor' },
        },
      });

      if (authError || !authData.user) {
        setFormErrors({ email: authError?.message || 'Registration failed' });
        setSaving(false);
        return;
      }

      await supabase.from('profiles').insert({
        id: authData.user.id,
        email: form.email,
        full_name: form.full_name,
        role: 'doctor',
        qualification: form.qualification || null,
        specialization: form.specialization || null,
        license_number: form.license_number || null,
        hospital_id: hospitalId,
        experience_years: form.experience_years ? parseInt(form.experience_years) : null,
        consultation_fee: form.consultation_fee ? parseFloat(form.consultation_fee) : null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setSaving(false);
    setModalOpen(false);
    fetchDoctors();
  };

  const toggleActive = async (doc: DoctorRecord) => {
    await supabase
      .from('profiles')
      .update({ is_active: !doc.is_active, updated_at: new Date().toISOString() })
      .eq('id', doc.id);
    fetchDoctors();
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface-50">
      <Sidebar
        items={sidebarItems}
        currentPath={location.pathname}
        onNavigate={(path) => navigate(path)}
        onLogout={logout}
        user={user ? { name: user.full_name, role: 'Hospital Admin' } : undefined}
      />

      <main className="flex-1 lg:ml-64 overflow-y-auto">
        <Header
          title="Doctor Management"
          subtitle={`${doctors.length} doctors registered`}
          actions={
            <Button variant="primary" size="md" icon={<Plus size={18} />} onClick={openAddModal}>
              Add Doctor
            </Button>
          }
          user={user ? { name: user.full_name, role: 'Admin' } : undefined}
        />

        <div className="p-4 sm:p-6 space-y-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Input
              placeholder="Search doctors by name, specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={16} />}
            />
          </motion.div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<UserCog size={24} />}
              title="No doctors found"
              description={searchQuery ? 'Try a different search' : 'Add your first doctor to get started'}
              action={!searchQuery ? { label: 'Add Doctor', onClick: openAddModal } : undefined}
            />
          ) : (
            <motion.div {...fadeIn} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((doc) => (
                <Card key={doc.id} hover className="relative">
                  {!doc.is_active && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="danger" size="sm">Inactive</Badge>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    {doc.avatar_url ? (
                      <img
                        src={doc.avatar_url}
                        alt={doc.full_name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-primary-700">{getInitials(doc.full_name)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-surface-900 truncate">{doc.full_name}</h3>
                      <p className="text-sm text-surface-500 truncate">{doc.specialization || 'General'}</p>
                      <p className="text-xs text-surface-400 truncate">{doc.qualification || 'No qualification'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-surface-50 rounded">
                      <p className="text-surface-400">License</p>
                      <p className="font-medium text-surface-700 truncate">{doc.license_number || 'N/A'}</p>
                    </div>
                    <div className="p-2 bg-surface-50 rounded">
                      <p className="text-surface-400">Experience</p>
                      <p className="font-medium text-surface-700">{doc.experience_years ?? '-'} yrs</p>
                    </div>
                    {doc.rating != null && (
                      <div className="p-2 bg-surface-50 rounded flex items-center gap-1">
                        <Star size={12} className="text-warning-500 fill-warning-500" />
                        <p className="font-medium text-surface-700">{doc.rating.toFixed(1)}</p>
                      </div>
                    )}
                    {doc.consultation_fee != null && (
                      <div className="p-2 bg-surface-50 rounded">
                        <p className="text-surface-400">Fee</p>
                        <p className="font-medium text-surface-700">₹{doc.consultation_fee}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-surface-100">
                    <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => openEditModal(doc)}>
                      Edit
                    </Button>
                    <Button
                      variant={doc.is_active ? 'ghost' : 'outline'}
                      size="sm"
                      icon={<Power size={14} />}
                      onClick={() => toggleActive(doc)}
                    >
                      {doc.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </Card>
              ))}
            </motion.div>
          )}
        </div>
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDoctor ? 'Edit Doctor' : 'Add Doctor'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            required
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            error={formErrors.full_name}
            placeholder="Dr. John Doe"
          />

          {!editingDoctor && (
            <>
              <Input
                label="Email"
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={formErrors.email}
                placeholder="doctor@hospital.com"
                icon={<Mail size={16} />}
              />
              <Input
                label="Password"
                required
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={formErrors.password}
                placeholder="Min 6 characters"
              />
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Qualification"
              value={form.qualification}
              onChange={(e) => setForm({ ...form, qualification: e.target.value })}
              placeholder="MBBS, MD"
              icon={<Award size={16} />}
            />
            <Input
              label="Specialization"
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              placeholder="Cardiology"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="License Number"
              value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
              placeholder="MED-12345"
              icon={<Shield size={16} />}
            />
            <Input
              label="Experience (years)"
              type="number"
              value={form.experience_years}
              onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
              placeholder="10"
            />
          </div>

          <Input
            label="Consultation Fee (₹)"
            type="number"
            value={form.consultation_fee}
            onChange={(e) => setForm({ ...form, consultation_fee: e.target.value })}
            placeholder="500"
          />

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" size="md" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" loading={saving} onClick={saveDoctor} className="flex-1">
              {editingDoctor ? 'Save Changes' : 'Add Doctor'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
