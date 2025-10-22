import { config } from '@config/index';
import { trackingService } from './tracking.service';

class MondayService {
  private readonly apiToken: string;
  private readonly boardId: string;
  private readonly defaultSource: string;
  private readonly apiUrl = 'https://api.monday.com/v2';

  constructor() {
    this.apiToken = process.env.MONDAY_API_TOKEN || '';
    this.boardId = process.env.MONDAY_BOARD_ID || '';
    this.defaultSource = process.env.MONDAY_DEFAULT_SOURCE || 'Boitage';

    if (!this.apiToken) {
      console.warn('⚠️ MONDAY_API_TOKEN not configured');
    }
    if (!this.boardId) {
      console.warn('⚠️ MONDAY_BOARD_ID not configured');
    }
  }

  // Méthode helper pour obtenir l'ID utilisateur Monday à partir de son email ou nom
  async getUserIdByEmail(email: string): Promise<string | null> {
    const query = `
      query {
        users {
          id
          name
          email
        }
      }
    `;

    try {
      const result = await this.mondayQuery(query);
      const user = result.users?.find((u: any) =>
        u.email?.toLowerCase() === email.toLowerCase()
      );
      return user?.id || null;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return null;
    }
  }

  private async mondayQuery(query: string, variables?: any) {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiToken,
        'API-Version': '2024-10',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Monday API error: ${response.status} - ${errorText}`);
      throw new Error(`Monday API error: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.errors) {
      console.error('Monday API GraphQL errors:', result.errors);
      throw new Error(`Monday GraphQL error: ${JSON.stringify(result.errors)}`);
    }

    return result.data;
  }

  async getBoardGroups() {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          groups {
            id
            title
          }
        }
      }
    `;

    const result = await this.mondayQuery(query, {
      boardId: this.boardId,
    });

    return result.boards[0]?.groups || [];
  }

  async getBoardColumns() {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          columns {
            id
            title
            type
          }
        }
      }
    `;

    const result = await this.mondayQuery(query, {
      boardId: this.boardId,
    });

    return result.boards[0]?.columns || [];
  }

  async getItem(itemId: string) {
    const query = `
      query ($itemId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          group {
            id
            title
          }
          column_values {
            id
            title
            text
            value
          }
        }
      }
    `;

    const result = await this.mondayQuery(query, {
      itemId: itemId,
    });

    return result.items[0] || null;
  }

  async getBoardItems() {
    const query = `
      query ($boardId: ID!) {
        boards(ids: [$boardId]) {
          items_page(limit: 10) {
            items {
              id
              name
              group {
                id
                title
              }
              created_at
            }
          }
        }
      }
    `;

    const result = await this.mondayQuery(query, {
      boardId: this.boardId,
    });

    return result.boards[0]?.items_page?.items || [];
  }

  async addCommentToItem(itemId: string, comment: string) {
    const mutation = `
      mutation ($itemId: ID!, $body: String!) {
        create_update (
          item_id: $itemId,
          body: $body
        ) {
          id
        }
      }
    `;

    const result = await this.mondayQuery(mutation, {
      itemId: itemId,
      body: comment,
    });

    console.log(`💬 Commentaire ajouté à l'item Monday ${itemId}`);
    return result.create_update;
  }

  async createQualificationItem(data: {
    annonceId: string;
    annonceUrl: string;
    typeBien: string;
    surface?: number;
    pieces?: number;
    codePostal: string;
    etiquetteDpe?: string;
    score: number;
    etape: string;
    notes?: string;
    tacheAFaire: boolean;
    datePublication?: string;
  }) {
    try {
      // Récupérer les groupes du board
      const groups = await this.getBoardGroups();
      if (groups.length === 0) {
        throw new Error('Aucun groupe trouvé dans le board Monday');
      }

      // Utiliser le premier groupe disponible
      const groupId = groups[0].id;
      console.log(`📌 Utilisation du groupe: ${groups[0].title} (${groupId})`);

      // Nom de l'item
      const itemName = `${data.typeBien} ${data.surface ? data.surface + 'm²' : ''} - ${data.codePostal}`.trim();

      // Préparer les valeurs des colonnes
      const columnValues: any = {};

      // Lien de l'annonce (long_text)
      if (data.annonceUrl) {
        columnValues.long_text_mkr0kq02 = data.annonceUrl;
        console.log(`🔗 Lien de l'annonce: ${data.annonceUrl}`);
      }

      // Étape (status) - temporairement désactivé car les labels ne correspondent pas
      // TODO: Récupérer les statuts disponibles depuis Monday et mapper correctement
      // if (data.etape) {
      //   columnValues.color_mkr03tjd = { label: data.etape };
      //   console.log(`📍 Étape: ${data.etape}`);
      // }

      // Tâches à faire (status)
      if (data.tacheAFaire) {
        columnValues.color_mkr08jq4 = { label: 'À faire' };
        console.log(`✅ Tâche à faire: Oui`);
      }

      // Source d'acquisition (status)
      columnValues.color_mkr0f69m = { label: this.defaultSource };
      console.log(`📥 Source: ${this.defaultSource}`);

      // Date de l'annonce (date)
      if (data.datePublication) {
        const date = new Date(data.datePublication);
        columnValues.date_mkr0narn = {
          date: date.toISOString().split('T')[0],
        };
        console.log(`📅 Date publication: ${date.toISOString().split('T')[0]}`);
      }

      console.log('📦 Column values:', JSON.stringify(columnValues, null, 2));

      const mutation = `
        mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
          create_item (
            board_id: $boardId,
            group_id: $groupId,
            item_name: $itemName,
            column_values: $columnValues
          ) {
            id
          }
        }
      `;

      const result = await this.mondayQuery(mutation, {
        boardId: this.boardId,
        groupId: groupId,
        itemName: itemName,
        columnValues: JSON.stringify(columnValues),
      });

      const mondayItemId = result.create_item.id;

      // Ajouter un commentaire si des notes sont fournies
      if (data.notes && data.notes.trim()) {
        await this.addCommentToItem(mondayItemId, data.notes);
      }

      // Mettre à jour le tracking
      await trackingService.updateMondaySync(
        data.annonceId,
        mondayItemId,
        this.boardId,
      );

      // Mettre à jour également l'étape, les notes et marquer comme traité
      await trackingService.updateTracking(data.annonceId, {
        statut: 'envoye_monday', // Marquer comme traité
        etapeMonday: data.etape,
        notes: data.notes,
        tacheAFaire: data.tacheAFaire,
      });

      console.log(`✅ Item créé dans Monday.com: ${mondayItemId} pour annonce ${data.annonceId}`);

      return {
        success: true,
        mondayItemId,
        itemName,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'item Monday:', error);
      throw error;
    }
  }

  async createDpeQualificationItem(data: {
    dpeId: string;
    numeroDpe: string;
    adresse: string;
    codePostal: string;
    typeBatiment: string;
    surface: number;
    etiquetteDpe: string;
    etiquetteGes?: string;
    anneConstruction?: number;
    etape: string;
    notes?: string;
    tacheAFaire: boolean;
  }) {
    try {
      // Récupérer les groupes du board
      const groups = await this.getBoardGroups();
      if (groups.length === 0) {
        throw new Error('Aucun groupe trouvé dans le board Monday');
      }

      // Utiliser le premier groupe disponible
      const groupId = groups[0].id;
      console.log(`📌 Utilisation du groupe: ${groups[0].title} (${groupId})`);

      // Nom de l'item - Ajouter [DPE] pour distinguer des annonces
      const itemName = `[DPE] ${data.typeBatiment} ${data.surface}m² - ${data.codePostal}`.trim();

      // Préparer les valeurs des colonnes
      const columnValues: any = {};

      // Lien vers le DPE (long_text) - utiliser le numéro DPE et l'adresse
      const dpeInfo = `DPE N° ${data.numeroDpe}\nAdresse: ${data.adresse}\nDPE: ${data.etiquetteDpe}${data.etiquetteGes ? ' | GES: ' + data.etiquetteGes : ''}\nAnnée construction: ${data.anneConstruction || 'N/A'}`;
      columnValues.long_text_mkr0kq02 = dpeInfo;
      console.log(`🔗 Info DPE: ${dpeInfo}`);

      // Tâches à faire (status)
      if (data.tacheAFaire) {
        columnValues.color_mkr08jq4 = { label: 'À faire' };
        console.log(`✅ Tâche à faire: Oui`);
      }

      // Source d'acquisition (status) - Utiliser "Boitage" (même source que les annonces)
      columnValues.color_mkr0f69m = { label: this.defaultSource };
      console.log(`📥 Source: ${this.defaultSource}`);

      console.log('📦 Column values:', JSON.stringify(columnValues, null, 2));

      const mutation = `
        mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
          create_item (
            board_id: $boardId,
            group_id: $groupId,
            item_name: $itemName,
            column_values: $columnValues
          ) {
            id
          }
        }
      `;

      const result = await this.mondayQuery(mutation, {
        boardId: this.boardId,
        groupId: groupId,
        itemName: itemName,
        columnValues: JSON.stringify(columnValues),
      });

      const mondayItemId = result.create_item.id;

      // Assigner à Maxence Daviot si configuré
      const maxenceEmail = process.env.MONDAY_DPE_ASSIGNEE_EMAIL || 'maxence.daviot@amepi.fr';
      try {
        const maxenceId = await this.getUserIdByEmail(maxenceEmail);
        if (maxenceId) {
          // Assigner dans la colonne "Responsable" (people column)
          // ID de la colonne Responsable : people_mkr0f710
          await this.assignPersonToItem(mondayItemId, 'people_mkr0f710', maxenceId);
          console.log(`👤 Assigné à Maxence Daviot (${maxenceId})`);
        } else {
          console.warn(`⚠️ Impossible de trouver l'utilisateur ${maxenceEmail}`);
        }
      } catch (assignError) {
        console.warn('⚠️ Erreur lors de l\'assignation:', assignError);
        // Ne pas faire échouer toute l'opération si l'assignation échoue
      }

      // Ajouter un commentaire si des notes sont fournies
      if (data.notes && data.notes.trim()) {
        await this.addCommentToItem(mondayItemId, data.notes);
      }

      console.log(`✅ Item DPE créé dans Monday.com: ${mondayItemId} pour DPE ${data.dpeId}`);

      return {
        success: true,
        mondayItemId,
        itemName,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'item DPE Monday:', error);
      throw error;
    }
  }

  // Méthode pour assigner une personne à un item
  async assignPersonToItem(itemId: string, columnId: string, userId: string) {
    const mutation = `
      mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value (
          board_id: $boardId,
          item_id: $itemId,
          column_id: $columnId,
          value: $value
        ) {
          id
        }
      }
    `;

    await this.mondayQuery(mutation, {
      boardId: this.boardId,
      itemId: itemId,
      columnId: columnId,
      value: JSON.stringify({ personsAndTeams: [{ id: parseInt(userId), kind: 'person' }] }),
    });
  }

  async updateQualificationItem(
    mondayItemId: string,
    data: {
      etape?: string;
      notes?: string;
      tacheAFaire?: boolean;
    },
  ) {
    try {
      const columnValues: any = {};

      if (data.etape) {
        columnValues.color_mkr03tjd = { label: data.etape };
      }

      if (data.tacheAFaire !== undefined) {
        columnValues.color_mkr08jq4 = { label: data.tacheAFaire ? 'À faire' : '' };
      }

      const mutation = `
        mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
          change_multiple_column_values (
            board_id: $boardId,
            item_id: $itemId,
            column_values: $columnValues
          ) {
            id
          }
        }
      `;

      await this.mondayQuery(mutation, {
        boardId: this.boardId,
        itemId: mondayItemId,
        columnValues: JSON.stringify(columnValues),
      });

      console.log(`✅ Item mis à jour dans Monday.com: ${mondayItemId}`);

      return {
        success: true,
        mondayItemId,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de l\'item Monday:', error);
      throw error;
    }
  }
}

export const mondayService = new MondayService();
