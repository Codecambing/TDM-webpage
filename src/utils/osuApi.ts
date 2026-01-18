// src/utils/osuApi.ts
const OSU_CLIENT_ID = import.meta.env.OSU_CLIENT_ID;
const OSU_CLIENT_SECRET = import.meta.env.OSU_CLIENT_SECRET;

let accessToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  // Si el token aún es válido, reutilizarlo
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const response = await fetch('https://osu.ppy.sh/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: OSU_CLIENT_ID,
      client_secret: OSU_CLIENT_SECRET,
      grant_type: 'client_credentials',
      scope: 'public',
    }),
  });

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  
  // Verificar que accessToken no sea null antes de retornar
  if (!accessToken) {
    throw new Error('Failed to obtain access token');
  }
  
  return accessToken;
}

export async function getOsuUser(userId: number) {
  const token = await getAccessToken();
  
  const response = await fetch(`https://osu.ppy.sh/api/v2/users/${userId}/osu`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user ${userId}`);
  }

  return await response.json();
}

export async function getMultipleOsuUsers(userIds: number[]) {
  const users = await Promise.all(
    userIds.map(id => getOsuUser(id))
  );
  return users;
}