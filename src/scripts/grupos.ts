import type { Player, Match } from '../types/tournament';
  import { db } from '../utils/firebase';
  import {
    doc,
    getDoc,
    onSnapshot,
    collection,
    getDocs,
    type DocumentData,
    type QuerySnapshot
  } from 'firebase/firestore';

  const GAME_BANNERS: Record<string, string> = {
  "osu!": "banners/osu.png",
  "WarioWare": "banners/warioware.png",
  "Smash Bros": "banners/smash.png",
  "Mario Kart": "banners/mariokart.png",
  "Wii Sports": "banners/wiisport.png",
  "Move or Die": "banners/moveordie.png",
  "TETR.IO": "banners/tetrio.png",
  "Mario Strikers": "banners/strikerscharged.png",
  "Cachipún": "banners/cachipun.png",
  "Chess Blitz": "banners/chessblitz.png",
};

function getGameBanner(game: string): string {
  return GAME_BANNERS[game] ?? '';
}

  /* ================================
    CARGA INICIAL
  ================================= */

  async function loadAllGroups(): Promise<void> {
    await loadGroup('A');
    await loadGroup('B');
    await loadGroup('C');
    await loadGroup('D');
  }

  async function loadGroup(groupLetter: string): Promise<void> {
    try {
      console.log(`Cargando grupo ${groupLetter}...`);

      const playersKey: string = `group${groupLetter}`;

      const groupRef = doc(db, 'groups', playersKey);
      const groupSnap = await getDoc(groupRef);

      const noGroupDiv = document.getElementById(`noGroup${groupLetter}`);
      const contentDiv = document.getElementById(`group${groupLetter}Content`);

      if (
        !groupSnap.exists() ||
        !groupSnap.data()?.players ||
        groupSnap.data().players.length === 0
      ) {
        noGroupDiv?.classList.remove('hidden');
        contentDiv?.classList.add('hidden');
        return;
      }

      const players: Player[] = groupSnap.data().players as Player[];

      noGroupDiv?.classList.add('hidden');
      contentDiv?.classList.remove('hidden');

      /* ================================
        PARTIDOS
      ================================= */

      const matchesRef = collection(db, 'groups', playersKey, 'matches');
      const matchesSnapshot: QuerySnapshot<DocumentData> = await getDocs(matchesRef);

      const matches: Match[] = matchesSnapshot.docs.map((d): Match => ({
        id: d.id,
        ...(d.data() as Omit<Match, 'id'>)
      }));

      showParticipants(groupLetter, players);
      showStandings(groupLetter, players, matches);
      showMatchHistory(groupLetter, players, matches);

      /* ================================
        LISTENERS EN TIEMPO REAL
      ================================= */

      onSnapshot(groupRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const players: Player[] = (snapshot.data().players ?? []) as Player[];

        if (players.length === 0) return;

        noGroupDiv?.classList.add('hidden');
        contentDiv?.classList.remove('hidden');

        showParticipants(groupLetter, players);
      });

      onSnapshot(matchesRef, async (snapshot) => {
        const matches: Match[] = snapshot.docs.map((d): Match => ({
          id: d.id,
          ...(d.data() as Omit<Match, 'id'>)
        }));

        const groupSnap = await getDoc(groupRef);
        if (!groupSnap.exists()) return;

        const players: Player[] = (groupSnap.data().players ?? []) as Player[];

        showStandings(groupLetter, players, matches);
        showMatchHistory(groupLetter, players, matches);
      });

    } catch (error) {
      console.error(`Error cargando grupo ${groupLetter}:`, error);
    }
  }

  /* ================================
    UI
  ================================= */

  function showParticipants(group: string, players: Player[]): void {
    const container = document.getElementById(`participants${group}`);
    if (!container) return;

    container.innerHTML = players.map((player: Player) => `
      <div class="bg-[var(--color-background)] p-4 rounded-lg shadow hover:scale-105 transition-transform">
        <div class="flex flex-col items-center">
          <img 
            src="${player.photo || '/mascota.png'}" 
            alt="${player.name}"
            class="w-20 h-20 rounded-full object-cover border-4 border-[var(--color-accent)] mb-3 shadow-lg"
          />
          <div class="font-bold font-space-mono text-lg text-center">
            ${player.name}
          </div>
        </div>
      </div>
    `).join('');
  }

  function showStandings(
    group: string,
    players: Player[],
    matches: Match[]
  ): void {
    const tbody = document.getElementById(`standings${group}`);
    if (!tbody) return;

    players.forEach((player: Player) => {
      player.played = 0;
      player.wins = 0;
      player.losses = 0;
      player.points = 0;
    });

    matches.forEach((match: Match) => {
      const p1 = players.find(p => p.id === match.player1);
      const p2 = players.find(p => p.id === match.player2);

      if (!p1 || !p2) return;

      p1.played!++;
      p2.played!++;

      if (match.winner === match.player1) {
        p1.wins!++;
        p1.points! += 3;
        p2.losses!++;
      } else {
        p2.wins!++;
        p2.points! += 3;
        p1.losses!++;
      }
    });

    const sorted: Player[] = [...players].sort(
      (a, b) => (b.points ?? 0) - (a.points ?? 0)
    );

    tbody.innerHTML = sorted.map((player, index) => `
      <tr class="border-b hover:bg-gray-50">
        <td class="p-3 font-bold">${index + 1}</td>
        <td class="p-3 font-semibold">${player.name}</td>
        <td class="p-3 text-center">${player.played}</td>
        <td class="p-3 text-center text-green-600 font-bold">${player.wins}</td>
        <td class="p-3 text-center text-red-600 font-bold">${player.losses}</td>
        <td class="p-3 text-center font-bold" style="color: var(--color-accent)">
          ${player.points}
        </td>
      </tr>
    `).join('');
  }

  function showMatchHistory(
    group: string,
    players: Player[],
    matches: Match[]
  ): void {
    const container = document.getElementById(`matchHistory${group}`);
    if (!container) return;

    if (matches.length === 0) {
      container.innerHTML =
        '<p class="text-gray-500 text-center">No hay partidos registrados</p>';
      return;
    }

    container.innerHTML = [...matches].reverse().map((match: Match) => {
      const p1Name = players.find(p => p.id === match.player1)?.name ?? 'Unknown';
      const p2Name = players.find(p => p.id === match.player2)?.name ?? 'Unknown';
      const winnerName = players.find(p => p.id === match.winner)?.name ?? 'Unknown';

      return `
  <div
    class="relative p-4 rounded-lg overflow-hidden shadow"
    style="
      background-image: url('${getGameBanner(match.game)}');
      background-size: cover;
      background-position: center;
    "
  >
    <!-- overlay -->
    <div class="absolute inset-0 bg-black/60"></div>

    <!-- contenido -->
    <div class="relative z-10">
      <div class="flex justify-between items-center flex-wrap gap-2">
        <div class="font-semibold text-white">
          <span class="${
            match.winner === match.player1
              ? 'text-green-400 font-bold'
              : 'text-white'
          }">
            ${p1Name}
          </span>
          vs
          <span class="${
            match.winner === match.player2
              ? 'text-green-400 font-bold'
              : 'text-white'
          }">
            ${p2Name}
          </span>
        </div>

        <div class="text-sm">
          <span class="bg-[var(--color-accent)] text-white px-3 py-1 rounded-full">
            ${match.game}
          </span>
        </div>
      </div>

      <div class="text-sm text-gray-200 mt-2">
        Ganador:
        <span class="font-bold text-green-400">
          ${winnerName}
        </span>
      </div>
    </div>
  </div>
`}).join('')
};


  /* ================================
    TABS
  ================================= */

  document.querySelectorAll<HTMLButtonElement>('.group-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const group = tab.dataset.group;
      if (!group) return;

      document.querySelectorAll('.group-tab').forEach(t => {
        t.classList.remove('active', 'bg-[var(--color-accent)]', 'text-white');
        t.classList.add('bg-gray-300', 'text-gray-700');
      });

      tab.classList.add('active', 'bg-[var(--color-accent)]', 'text-white');
      tab.classList.remove('bg-gray-300', 'text-gray-700');

      document.querySelectorAll('.group-content').forEach(content => {
        content.classList.add('hidden');
      });

      document
        .querySelector<HTMLElement>(`.group-content[data-group="${group}"]`)
        ?.classList.remove('hidden');
    });
  });

 export function initGroups(): void {
  loadAllGroups();
  }