import { useNavigate } from 'react-router-dom';
import RedFlagEmergency from '../../components/RedFlagEmergency';

export default function EmergencyDemo() {
  const navigate = useNavigate();
  const continueTo = () => navigate('/kiosk/documents');

  return (
    <RedFlagEmergency
      severity="critical"
      priorityToken="P-001"
      onHelp={() => { /* handled internally */ }}
      onContinue={continueTo}
    />
  );
}
