import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import Button from '../../components/shared/Button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-danger-50 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-danger-500" />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">Access Denied</h1>
        <p className="text-surface-500 mb-8">
          You don't have permission to access this page. Please contact your administrator if you
          believe this is an error.
        </p>
        <Link to="/login">
          <Button icon={<ArrowLeft size={16} />}>Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}
