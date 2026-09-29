import { redirect } from 'next/navigation';
import { AdminPasswordForm } from '@/components/admin-password-form';
import { verifyAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { formatBRL } from '@/lib/money';

export default async function Config() {
  const admin = await verifyAdmin(true);
  if (!admin) redirect('/admin/login');
  const rules = await db.deliveryRule.findMany({ orderBy: { minKm: 'asc' } });
  return (
    <main className="min-h-[70vh] bg-[#f5f1e9] px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-4xl text-wine">Configurações</h1>
        {!admin.mustChangePassword && <>
          <section className="form-card mt-8">
            <h2 className="font-serif text-2xl text-wine">Taxas de entrega</h2>
            <div className="mt-3 space-y-3">{rules.map((rule) => (
              <div key={rule.id} className="flex flex-wrap justify-between gap-3 border-b py-4 last:border-0">
                <span>{Number(rule.minKm).toFixed(2)} km até {Number(rule.maxKm).toFixed(2)} km</span>
                <span>Base {formatBRL(rule.baseFeeCents)} + {formatBRL(rule.extraFeeCentsPerKm)}/km</span>
              </div>
            ))}</div>
          </section>
        </>}
        <AdminPasswordForm required={admin.mustChangePassword} />
      </div>
    </main>
  );
}
