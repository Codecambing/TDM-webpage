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

  const BASE = import.meta.env.BASE_URL;

const GAME_BANNERS: Record<string, string> = {
  "osu!": `${BASE}banners/osu.png`,
  "WarioWare": `${BASE}banners/warioware.png`,
  "Smash Bros": `${BASE}banners/smash.png`,
  "Mario Kart": `${BASE}banners/mariokart.png`,
  "Wii Sports": `${BASE}banners/wiisport.png`,
  "Move or Die": `${BASE}banners/moveordie.png`,
  "TETR.IO": `${BASE}banners/tetrio.png`,
  "Mario Strikers": `${BASE}banners/strikerscharged.png`,
  "Cachipún": `${BASE}banners/cachipun.png`,
  "Chess Blitz": `${BASE}banners/chessblitz.png`,
};
const previousStandings: Record<string, Map<string, number>> = {
  A: new Map(),
  B: new Map(),
  C: new Map(),
  D: new Map(),
};

function isGroupVisible(group: string): boolean {
  const content = document.querySelector<HTMLElement>(
    `.group-content[data-group="${group}"]`
  );
  return !!content && !content.classList.contains('hidden');
}



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
    const canAnimate = isGroupVisible(group);
    const tbody = document.getElementById(`standings${group}`);
    if (!tbody) return;

    /* guardar posiciones anteriores */
  if (canAnimate) {
    Array.from(tbody.children).forEach((row, index) => {
      const id = (row as HTMLElement).dataset.player;
      if (id) previousStandings[group].set(id, index);
    });
  } else {
  // sincroniza sin animar
    previousStandings[group].clear();
  }


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

    if (tbody.children.length === 0) {
  players.forEach(player => {
    const tr = document.createElement('tr');
    tr.className = 'standings-row border-b transition-transform duration-300';
    tr.dataset.player = player.id;

    tr.innerHTML = `
      <td class="p-3 font-bold"></td>
      <td class="p-3 font-semibold"></td>
      <td class="p-3 text-center"></td>
      <td class="p-3 text-center text-green-600 font-bold"></td>
      <td class="p-3 text-center text-red-600 font-bold"></td>
      <td class="p-3 text-center font-bold" style="color: var(--color-accent)"></td>
    `;

    tbody.appendChild(tr);
  });
}

    const sorted: Player[] = [...players].sort(
      (a, b) => (b.points ?? 0) - (a.points ?? 0)
    );

sorted.forEach((player, index) => {
  const row = tbody.querySelector<HTMLElement>(
    `[data-player="${player.id}"]`
  );
  if (!row) return;

  const cells = row.children;
  cells[0].textContent = String(index + 1);
  cells[1].textContent = player.name;
  cells[2].textContent = String(player.played);
  cells[3].textContent = String(player.wins);
  cells[4].textContent = String(player.losses);
  cells[5].textContent = String(player.points);

  tbody.appendChild(row);
});

if (!canAnimate) return;

Array.from(tbody.children).forEach((row, newIndex) => {

  const id = (row as HTMLElement).dataset.player;
  if (!id) return;

  const oldIndex = previousStandings[group].get(id);
  if (oldIndex === undefined) return;

  const diff = oldIndex - newIndex;
  if (diff !== 0) {
    const el = row as HTMLElement;
    el.style.transform = `translateY(${diff * 48}px)`;
    requestAnimationFrame(() => {
      el.style.transform = '';
    });
  }
});
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

      previousStandings[group].clear();

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