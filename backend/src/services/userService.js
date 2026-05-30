import { query } from '../db.js';

// Wandelt eine DB-Zeile in das User-Schema der API um (camelCase).
export function toUserDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    description: row.description,
    type: row.type,
    oauthProvider: row.oauth_provider,
    oauthProviderId: row.oauth_provider_id,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getUserById(id) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

// Legt den User beim ersten Login an oder aktualisiert OAuth-Stammdaten.
// E-Mail/Avatar werden vom Provider übernommen; Profilfelder (type, description)
// bleiben bei bestehenden Usern unangetastet.
export async function upsertOAuthUser(profile) {
  const { rows } = await query(
    `INSERT INTO users (email, first_name, last_name, oauth_provider, oauth_provider_id, avatar_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (oauth_provider, oauth_provider_id)
     DO UPDATE SET
       email = EXCLUDED.email,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = now()
     RETURNING *`,
    [
      profile.email,
      profile.firstName,
      profile.lastName,
      profile.provider,
      profile.providerId,
      profile.avatarUrl,
    ],
  );
  return rows[0];
}

// Aktualisiert erlaubte Profilfelder. `fields` ist bereits validiert.
export async function updateUser(id, fields) {
  const allowed = ['firstName', 'lastName', 'description', 'type'];
  const columnMap = {
    firstName: 'first_name',
    lastName: 'last_name',
    description: 'description',
    type: 'type',
  };

  const sets = [];
  const values = [];
  let idx = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${columnMap[key]} = $${idx}`);
      values.push(fields[key]);
      idx += 1;
    }
  }

  if (sets.length === 0) {
    return getUserById(id);
  }

  sets.push(`updated_at = now()`);
  values.push(id);
  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return rows[0] ?? null;
}
