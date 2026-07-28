import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function AddTab() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return <Redirect href={user ? '/create-listing' : '/auth'} />;
}
