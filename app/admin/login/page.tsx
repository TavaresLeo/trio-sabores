'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Falha no login.');
        return;
      }
      router.push(data.mustChangePassword ? '/admin/configuracoes' : '/admin');
      router.refresh();
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[70vh] bg-[#f5f1e9] px-5 py-16">
      <form onSubmit={submit} className="form-card mx-auto max-w-md space-y-4">
        <div className="text-sm text-red">TRIO SABORES</div>
        <h1 className="font-serif text-3xl text-wine">Acesso administrativo</h1>
        <div className="field"><label htmlFor="admin-login">Login</label><input id="admin-login" autoComplete="username" value={login} onChange={(event) => setLogin(event.target.value)} required /></div>
        <div className="field"><label htmlFor="admin-password">Senha</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <button disabled={loading} className="btn-primary w-full">{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </main>
  );
}
