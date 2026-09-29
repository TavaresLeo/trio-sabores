'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function AdminPasswordForm({ required = false }: { required?: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (newPassword !== confirmation) {
      setError('A confirmação da senha não corresponde.');
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/admin/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Não foi possível alterar a senha.');
        return;
      }
      setMessage('Senha alterada. Entre novamente usando sua nova senha.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      router.push('/admin/login');
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="form-card admin-password-form" onSubmit={submit}>
      <h2 className="font-serif text-2xl text-wine">{required ? 'Defina sua nova senha' : 'Alterar senha administrativa'}</h2>
      {required && <p role="alert" className="text-sm text-brown/70">Por segurança, troque a senha inicial antes de acessar o restante do painel.</p>}
      <div className="field"><label htmlFor="current-admin-password">Senha atual</label><input id="current-admin-password" type="password" autoComplete="current-password" minLength={8} maxLength={72} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div>
      <div className="field"><label htmlFor="new-admin-password">Nova senha</label><input id="new-admin-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><small>Use pelo menos 8 caracteres.</small></div>
      <div className="field"><label htmlFor="confirm-admin-password">Confirme a nova senha</label><input id="confirm-admin-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div>
      {error && <p role="alert" className="text-sm text-red">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      <button disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Alterar senha'}</button>
    </form>
  );
}
