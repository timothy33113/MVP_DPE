import { prisma } from '../src/config/database';

async function main() {
  console.log('🔍 Recherche des annonces TaskImmo...\n');

  // Chercher dans rawData.owner_name
  const annonces = await prisma.leboncoinAnnonce.findMany({
    select: {
      listId: true,
      url: true,
      typeBien: true,
      surface: true,
      pieces: true,
      codePostal: true,
      etiquetteDpe: true,
      etiquetteGes: true,
      rawData: true
    }
  });

  const taskimmoAnnonces = annonces.filter(annonce => {
    const rawData = annonce.rawData as any;
    const ownerName = rawData?.owner?.name?.toLowerCase() || '';
    const ownerType = rawData?.owner?.type || '';

    return ownerName.includes('taskimmo') || ownerName.includes('task immo');
  });

  console.log(`📊 RÉSULTAT: ${taskimmoAnnonces.length} annonces TaskImmo sur ${annonces.length} annonces totales\n`);

  if (taskimmoAnnonces.length > 0) {
    console.log('📋 LISTE DES ANNONCES TASKIMMO:\n');

    taskimmoAnnonces.forEach((annonce, index) => {
      const rawData = annonce.rawData as any;
      const title = rawData?.subject || 'Sans titre';
      const ownerName = rawData?.owner?.name || 'N/A';

      console.log(`[${index + 1}/${taskimmoAnnonces.length}] ${title}`);
      console.log(`   Agence: ${ownerName}`);
      console.log(`   Type: ${annonce.typeBien} | Surface: ${annonce.surface}m² | Pièces: ${annonce.pieces || 'N/A'}`);
      console.log(`   CP: ${annonce.codePostal} | DPE: ${annonce.etiquetteDpe || '?'} | GES: ${annonce.etiquetteGes || '?'}`);
      console.log(`   ${annonce.url}\n`);
    });

    // Statistiques
    const parType = {
      MAISON: taskimmoAnnonces.filter(a => a.typeBien === 'MAISON').length,
      APPARTEMENT: taskimmoAnnonces.filter(a => a.typeBien === 'APPARTEMENT').length,
      TERRAIN: taskimmoAnnonces.filter(a => a.typeBien === 'TERRAIN').length,
    };

    const avecDpe = taskimmoAnnonces.filter(a => a.etiquetteDpe && a.etiquetteGes).length;
    const sansDpe = taskimmoAnnonces.length - avecDpe;

    console.log('📊 STATISTIQUES TASKIMMO:');
    console.log(`   Maisons: ${parType.MAISON}`);
    console.log(`   Appartements: ${parType.APPARTEMENT}`);
    console.log(`   Terrains: ${parType.TERRAIN}`);
    console.log(`   Avec DPE/GES: ${avecDpe} (${(avecDpe/taskimmoAnnonces.length*100).toFixed(1)}%)`);
    console.log(`   Sans DPE/GES: ${sansDpe} (${(sansDpe/taskimmoAnnonces.length*100).toFixed(1)}%)\n`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
