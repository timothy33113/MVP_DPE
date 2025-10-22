/**
 * Script de seed pour la base de données
 * Crée des données de test pour le développement
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { hashApiKey } from '../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Créer des utilisateurs de test
  const userPassword = await bcrypt.hash('Test1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: userPassword,
      role: 'ADMIN',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      role: 'USER',
    },
  });

  console.log(`✓ Created users: admin@example.com, user@example.com (password: Test1234)`);

  // 2. Créer des API keys de test
  const apiKey1 = 'dpm_test_key_1234567890abcdef1234567890abcdef1234567890abcdef12';
  const hashedKey1 = hashApiKey(apiKey1);

  await prisma.apiKey.upsert({
    where: { key: hashedKey1 },
    update: {},
    create: {
      key: hashedKey1,
      name: 'Test API Key',
      description: 'API key for development testing',
      userId: user.id,
      permissions: ['dpe:read', 'dpe:write', 'matching:run', 'matching:read'],
      isActive: true,
    },
  });

  console.log(`✓ Created API key: ${apiKey1}`);

  // 3. Créer des DPE de test
  const dpes = [
    {
      numeroDpe: 'TEST2024001',
      adresseBan: '10 Rue de la Paix',
      codePostalBan: '75001',
      typeBatiment: 'APPARTEMENT' as const,
      surfaceHabitable: 45,
      anneConstruction: 1990,
      etiquetteDpe: 'C' as const,
      etiquetteGes: 'D' as const,
      coordonneeX: 2.3522,
      coordonneeY: 48.8566,
      dateEtablissement: new Date('2024-01-15'),
    },
    {
      numeroDpe: 'TEST2024002',
      adresseBan: '25 Avenue des Champs',
      codePostalBan: '75008',
      typeBatiment: 'MAISON' as const,
      surfaceHabitable: 120,
      anneConstruction: 2005,
      etiquetteDpe: 'B' as const,
      etiquetteGes: 'C' as const,
      coordonneeX: 2.3088,
      coordonneeY: 48.8698,
      dateEtablissement: new Date('2024-01-16'),
    },
    {
      numeroDpe: 'TEST2024003',
      adresseBan: '5 Boulevard Saint-Michel',
      codePostalBan: '75005',
      typeBatiment: 'APPARTEMENT' as const,
      surfaceHabitable: 65,
      anneConstruction: 1985,
      etiquetteDpe: 'D' as const,
      etiquetteGes: 'E' as const,
      coordonneeX: 2.3444,
      coordonneeY: 48.8499,
      dateEtablissement: new Date('2024-01-17'),
    },
  ];

  for (const dpe of dpes) {
    await prisma.dpeRecord.upsert({
      where: { numeroDpe: dpe.numeroDpe },
      update: dpe,
      create: dpe,
    });
  }

  console.log(`✓ Created ${dpes.length} DPE records`);

  // 4. Créer des annonces Leboncoin de test
  const annonces = [
    {
      listId: BigInt(2001),
      url: 'https://www.leboncoin.fr/test/2001',
      codePostal: '75001',
      typeBien: 'APPARTEMENT' as const,
      surface: 45,
      pieces: 2,
      anneConstruction: 1990,
      etiquetteDpe: 'C' as const,
      etiquetteGes: 'D' as const,
      lat: 48.8566,
      lng: 2.3522,
      datePublication: new Date('2024-01-15'),
    },
    {
      listId: BigInt(2002),
      url: 'https://www.leboncoin.fr/test/2002',
      codePostal: '75008',
      typeBien: 'MAISON' as const,
      surface: 120,
      pieces: 5,
      anneConstruction: 2005,
      etiquetteDpe: 'B' as const,
      etiquetteGes: 'C' as const,
      lat: 48.8698,
      lng: 2.3088,
      datePublication: new Date('2024-01-16'),
    },
  ];

  for (const annonce of annonces) {
    await prisma.leboncoinAnnonce.upsert({
      where: { listId: annonce.listId },
      update: annonce,
      create: annonce,
    });
  }

  console.log(`✓ Created ${annonces.length} Leboncoin annonces`);

  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n📝 Test credentials:');
  console.log('   Email: admin@example.com | user@example.com');
  console.log('   Password: Test1234');
  console.log(`   API Key: ${apiKey1}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
