import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set to connect to PostgreSQL.');
}
const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD ?? '';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const categories = [
  ["Bolos Caseiros", "bolos-caseiros"], ["Mini Pizzas", "mini-pizzas"],
  ["Salgados", "salgados"], ["Empadões", "empadoes"], ["Doces", "doces"], ["Cafés", "cafes"],
] as const;

const products = [
  ["Bolo de Laranja", "bolo-de-laranja", "Massa fofinha com calda especial de laranja, feita para o café da tarde.", 4290, "/images/bolo-de-laranja-caseiro.jpeg", "Favorito da Casa", "bolos-caseiros"],
  ["Pudim de Leite", "pudim-de-leite", "Cremoso, delicado e com calda de caramelo brilhante.", 2690, "/images/pudim-leite-condensado.jpeg", "Mais Vendido", "doces"],
  ["Bolo de Fubá", "bolo-de-fuba", "Clássico de casa, macio e perfeito com café coado.", 3490, "/images/bolo-de-fuba-com-laranja.jpeg", null, "bolos-caseiros"],
  ["Mini Pizzas", "mini-pizzas", "Massa leve, recheio generoso e assadas na hora.", 3690, "/images/banner-horizontal.jpeg", "Mais Vendido", "mini-pizzas"],
  ["Empadão de Frango", "empadao-de-frango", "Recheio cremoso de frango em massa dourada e delicada.", 5490, "/images/banner-vertical.jpeg", null, "empadoes"],
  ["Coxinha de Frango", "coxinha-de-frango", "Massa macia, recheio bem temperado e fritura crocante.", 3290, "/images/banner-vertical.jpeg", "Favorito da Casa", "salgados"],
  ["Bolo de Chocolate", "bolo-de-chocolate", "Chocolate intenso, cobertura cremosa e raspas por cima.", 4490, "/images/bolo-de-laranja-com-chocolate.jpeg", "Mais Vendido", "bolos-caseiros"],
  ["Cappuccino", "cappuccino", "Espresso, leite vaporizado e espuma cremosa.", 1690, "/images/banner-vertical.jpeg", null, "cafes"],
] as const;

async function main() {
  const categoryMap = new Map<string, string>();
  for (let i = 0; i < categories.length; i++) {
    const [name, slug] = categories[i];
    const category = await prisma.category.upsert({ where: { slug }, update: { name, sortOrder: i }, create: { name, slug, sortOrder: i } });
    categoryMap.set(slug, category.id);
  }
  for (let i = 0; i < products.length; i++) {
    const [name, slug, description, priceCents, imageUrl, badge, categorySlug] = products[i];
    await prisma.product.upsert({ where: { slug }, update: { name, description, priceCents, imageUrl, badge, categoryId: categoryMap.get(categorySlug)!, featured: i < 6, sortOrder: i }, create: { name, slug, description, priceCents, imageUrl, badge, categoryId: categoryMap.get(categorySlug)!, featured: i < 6, sortOrder: i } });
  }
  const rules = [
    { minKm: 0, maxKm: 3, baseFeeCents: 500, extraFeeCentsPerKm: 0 },
    { minKm: 3.01, maxKm: 7, baseFeeCents: 500, extraFeeCentsPerKm: 250 },
    { minKm: 7.01, maxKm: 12, baseFeeCents: 1500, extraFeeCentsPerKm: 300 },
  ];
  for (const r of rules) await prisma.deliveryRule.upsert({ where: { id: `${r.minKm}-${r.maxKm}` }, update: r, create: { id: `${r.minKm}-${r.maxKm}`, ...r } });
  const adminEmail = 'admin@triosabores.local';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const needsAdminBootstrap = !existingAdmin || (existingAdmin.sessionVersion === 0 && !existingAdmin.mustChangePassword);
  if (needsAdminBootstrap) {
    const passwordBytes = new TextEncoder().encode(initialAdminPassword).byteLength;
    const minimumPasswordBytes = process.env.NODE_ENV === 'production' ? 16 : 8;
    if (passwordBytes < minimumPasswordBytes || passwordBytes > 72) {
      throw new Error(`ADMIN_INITIAL_PASSWORD must be set to a password between ${minimumPasswordBytes} and 72 UTF-8 bytes.`);
    }
  }
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(initialAdminPassword, 12);
    await prisma.user.create({
      data: { name: 'Administrador', email: adminEmail, passwordHash, role: 'ADMIN', mustChangePassword: true },
    });
  } else if (existingAdmin.sessionVersion === 0 && !existingAdmin.mustChangePassword) {
    const passwordHash = await bcrypt.hash(initialAdminPassword, 12);
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { passwordHash, mustChangePassword: true, sessionVersion: { increment: 1 } },
    });
  }
  console.log("Seed concluído.");
}
main().finally(() => prisma.$disconnect());
