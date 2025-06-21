import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RegisterPage: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    telephone: '',
    email: '',
    username: '',
    password: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const success = await register(form as any);
    setLoading(false);
    if (success) {
      toast.success('Registered successfully, please verify email');
      onBack?.();
    } else {
      toast.error('Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen background-login">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 flex flex-col">
        <h2 className="text-xl font-medium mb-4 text-center">Create Account</h2>
        {Object.entries(form).map(([key, value]) => (
          <input
            key={key}
            name={key}
            value={value}
            onChange={handleChange}
            placeholder={key}
            className="w-full px-3 py-2 border rounded mb-3"
          />
        ))}
        <button
          className="w-full bg-blue-500 text-white py-2 rounded-xl hover:bg-blue-600 mb-2"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Please wait...' : 'Register'}
        </button>
        <button className="text-sm text-center text-blue-500" onClick={onBack}>Back to login</button>
      </div>
    </div>
  );
};

export default RegisterPage;
