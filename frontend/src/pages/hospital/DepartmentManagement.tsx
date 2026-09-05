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
  Edit2,
  Power,
  Palette,
  Stethoscope,
  Heart,
  Bone,
  Brain,
  Baby,
  Eye,
  Ear,
  Smile,
  Activity,
  Shield,
  Pill,
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

interface DepartmentRecord {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  doctor_count: number;
  patient_count_today: number;
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

const presetIcons = [
  { value: 'stethoscope', label: 'Stethoscope', icon: Stethoscope },
  { value: 'heart', label: 'Heart', icon: Heart },
  { value: 'bone', label: 'Bone', icon: Bone },
  { value: 'brain', label: 'Brain', icon: Brain },
  { value: 'baby', label: 'Baby', icon: Baby },
  { value: 'eye', label: 'Eye', icon: Eye },
  { value: 'ear', label: 'Ear', icon: Ear },
  { value: 'smile', label: 'Smile', icon: Smile },
  { value: 'activity', label: 'Activity', icon: Activity },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'pill', label: 'Pill', icon: Pill },
  { value: 'palette', label: 'Palette', icon: Palette },
];

const presetColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  '#84CC16', '#E11D48',
];

interface DeptForm {
  name: string;
  description: string;
  icon: string;
  color: string;
}

const emptyForm: DeptForm = {
  name: '',
  description: '',
  icon: 'stethoscope',
  color: '#3B82F6',
};

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

function getIconComponent(iconValue: string | null) {
  const found = presetIcons.find((i) => i.value === iconValue);
  return found ? found.icon : Stethoscope;
}

export default function DepartmentManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [hospitalId, setHospitalId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentRecord | null>(null);
  const [form, setForm] = useState<DeptForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DeptForm, string>>>({});

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

  const fetchDepartments = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);

    const { data: depts } = await supabase
      .from('departments')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('name', { ascending: true });

    if (depts) {
      const today = new Date().toISOString().split('T')[0];
      const enriched = await Promise.all(
        depts.map(async (d) => {
          const [doctorCount, patientCount] = await Promise.all([
            supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('role', 'doctor')
              .eq('hospital_id', hospitalId)
              .eq('specialization', d.name)
              .eq('is_active', true),
            supabase
              .from('visits')
              .select('*', { count: 'exact', head: true })
              .eq('hospital_id', hospitalId)
              .eq('department_id', d.id)
              .eq('visit_date', today),
          ]);
          return {
            ...d,
            doctor_count: doctorCount.count || 0,
            patient_count_today: patientCount.count || 0,
          };
        })
      );
      setDepartments(enriched as DepartmentRecord[]);
    }

    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    if (hospitalId) fetchDepartments();
  }, [hospitalId, fetchDepartments]);

  const openAddModal = () => {
    setEditingDept(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (dept: DepartmentRecord) => {
    setEditingDept(dept);
    setForm({
      name: dept.name,
      description: dept.description || '',
      icon: dept.icon || 'stethoscope',
      color: dept.color || '#3B82F6',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof DeptForm, string>> = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveDepartment = async () => {
    if (!validate() || !hospitalId) return;
    setSaving(true);

    if (editingDept) {
      await supabase
        .from('departments')
        .update({
          name: form.name,
          description: form.description || null,
          icon: form.icon,
          color: form.color,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingDept.id);
    } else {
      await supabase.from('departments').insert({
        name: form.name,
        description: form.description || null,
        icon: form.icon,
        color: form.color,
        hospital_id: hospitalId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    setSaving(false);
    setModalOpen(false);
    fetchDepartments();
  };

  const toggleActive = async (dept: DepartmentRecord) => {
    await supabase
      .from('departments')
      .update({ is_active: !dept.is_active, updated_at: new Date().toISOString() })
      .eq('id', dept.id);
    fetchDepartments();
  };

  const IconComp = getIconComponent(form.icon);

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
          title="Department Management"
          subtitle={`${departments.length} departments`}
          actions={
            <Button variant="primary" size="md" icon={<Plus size={18} />} onClick={openAddModal}>
              Add Department
            </Button>
          }
          user={user ? { name: user.full_name, role: 'Admin' } : undefined}
        />

        <div className="p-4 sm:p-6">
          {departments.length === 0 ? (
            <EmptyState
              icon={<Building2 size={24} />}
              title="No departments yet"
              description="Create your first department to start organizing your hospital"
              action={{ label: 'Add Department', onClick: openAddModal }}
            />
          ) : (
            <motion.div {...fadeIn} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((dept) => {
                const DeptIcon = getIconComponent(dept.icon);
                return (
                  <Card key={dept.id} hover className="relative">
                    {!dept.is_active && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="danger" size="sm">Inactive</Badge>
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${dept.color || '#3B82F6'}15` }}
                      >
                        <DeptIcon size={24} style={{ color: dept.color || '#3B82F6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-surface-900 truncate">{dept.name}</h3>
                        {dept.description && (
                          <p className="text-sm text-surface-500 line-clamp-2 mt-0.5">{dept.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="p-2 bg-surface-50 rounded text-center">
                        <p className="text-lg font-bold text-surface-900">{dept.doctor_count}</p>
                        <p className="text-xs text-surface-500">Doctors</p>
                      </div>
                      <div className="p-2 bg-surface-50 rounded text-center">
                        <p className="text-lg font-bold text-surface-900">{dept.patient_count_today}</p>
                        <p className="text-xs text-surface-500">Patients Today</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 pt-3 border-t border-surface-100">
                      <Button variant="ghost" size="sm" icon={<Edit2 size={14} />} onClick={() => openEditModal(dept)}>
                        Edit
                      </Button>
                      <Button
                        variant={dept.is_active ? 'ghost' : 'outline'}
                        size="sm"
                        icon={<Power size={14} />}
                        onClick={() => toggleActive(dept)}
                      >
                        {dept.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </motion.div>
          )}
        </div>
      </main>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Add Department'}
        size="lg"
      >
        <div className="space-y-5">
          <Input
            label="Department Name"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={formErrors.name}
            placeholder="e.g. Cardiology"
          />

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Description</label>
            <textarea
              className="w-full rounded-lg border border-surface-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
              rows={3}
              placeholder="Brief description of the department..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {presetIcons.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setForm({ ...form, icon: item.value })}
                    className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                      form.icon === item.value
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-surface-200 text-surface-500 hover:bg-surface-50'
                    }`}
                    title={item.label}
                  >
                    <Icon size={20} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {presetColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    form.color === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                />
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-surface-300 flex items-center justify-center text-surface-400 hover:border-surface-400 transition-colors">
                  <Palette size={14} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${form.color}15` }}
            >
              <IconComp size={22} style={{ color: form.color }} />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-900">{form.name || 'Department Name'}</p>
              <p className="text-xs text-surface-500">{form.description || 'No description'}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" size="md" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" loading={saving} onClick={saveDepartment} className="flex-1">
              {editingDept ? 'Save Changes' : 'Add Department'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
