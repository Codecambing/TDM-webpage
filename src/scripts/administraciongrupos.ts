// src/scripts/administracionGrupos.ts
import type { Player, Match } from '../types/tournament';
import { db } from '../utils/firebase';
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  type DocumentData,
  type QuerySnapshot
} from 'firebase/firestore';

const PASSWORD = 'gustavoepstein';

let groupAPlayers: Player[] = [];
let groupAMatches: Match[] = [];

export function initAdminGroups(): void {
  setupPasswordModal();
  initializeFirebase();
}

function setupPasswordModal(): void {
  const modal = document.getElementById('passwordModal');
  const content = document.getElementById('adminContent');
  const input = document.getElementById('passwordInput') as HTMLInputElement | null;
  const submitBtn = document.getElementById('submitPassword');
  const errorMsg = document.getElementById('errorMessage');

  if (sessionStorage.getItem('adminAuth') === 'true') {
    modal?.classList.add('hidden');
    content?.classList.remove('hidden');
    return;
  }

  submitBtn?.addEventListener('click', checkPassword);
  input?.addEventListener('keypress', (e: KeyboardEvent) => {
    if (e.key === 'Enter') checkPassword();
  });

  function checkPassword(): void {
    if (input?.value === PASSWORD) {
      sessionStorage.setItem('adminAuth', 'true');
      modal?.classList.add('hidden');
      content?.classList.remove('hidden');
      errorMsg?.classList.add('hidden');
    } else {
      errorMsg?.classList.remove('hidden');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  }
}

async function initializeFirebase(): Promise<void> {
  await loadGroupFromFirebase('A');
}

async function loadGroupFromFirebase(group: 'A'): Promise<void> {
  const groupRef = doc(db, 'groups', `group${group}`);

  const groupSnap = await getDoc(groupRef);
  if (groupSnap.exists()) {
    const players = (groupSnap.data().players ?? []) as Player[];
    groupAPlayers = players;
    updateStandings();
    updateMatchSelects();
  }

  const matchesRef = collection(db, 'groups', `group${group}`, 'matches');
  const matchesSnap: QuerySnapshot<DocumentData> = await getDocs(matchesRef);

  groupAMatches = matchesSnap.docs.map((d): Match => ({
    id: d.id,
    ...(d.data() as Omit<Match, 'id'>)
  }));

  updateMatchHistory();

  onSnapshot(groupRef, snap => {
    if (!snap.exists()) return;
    groupAPlayers = (snap.data().players ?? []) as Player[];
    updateStandings();
    updateMatchSelects();
  });

  onSnapshot(matchesRef, snap => {
    groupAMatches = snap.docs.map((d): Match => ({
      id: d.id,
      ...(d.data() as Omit<Match, 'id'>)
    }));
    updateStandings();
    updateMatchHistory();
  });
}

function updateStandings(): void {
  const tbody = document.getElementById('standingsA');
  if (!tbody) return;

  groupAPlayers.forEach(p => {
    p.played = 0;
    p.wins = 0;
    p.losses = 0;
    p.points = 0;
  });

  groupAMatches.forEach(match => {
    const p1 = groupAPlayers.find(p => p.id === match.player1);
    const p2 = groupAPlayers.find(p => p.id === match.player2);
    if (!p1 || !p2) return;

    p1.played++;
    p2.played++;

    if (match.winner === match.player1) {
      p1.wins++;
      p1.points += 3;
      p2.losses++;
    } else {
      p2.wins++;
      p2.points += 3;
      p1.losses++;
    }
  });

  const sorted = [...groupAPlayers].sort((a, b) => b.points - a.points);

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

function updateMatchSelects(): void {
  const s1 = document.getElementById('matchPlayer1A') as HTMLSelectElement | null;
  const s2 = document.getElementById('matchPlayer2A') as HTMLSelectElement | null;
  if (!s1 || !s2) return;

  const options = groupAPlayers
    .map(p => `<option value="${p.id}">${p.name}</option>`)
    .join('');

  s1.innerHTML = `<option value="">Jugador 1</option>${options}`;
  s2.innerHTML = `<option value="">Jugador 2</option>${options}`;
}

  function getPlayerNameById(id: string): string {
  return groupAPlayers.find(p => p.id === id)?.name ?? 'Unknown';
}

function updateMatchHistory(): void {
  const container = document.getElementById('matchHistoryA');
  if (!container) return;

  if (groupAMatches.length === 0) {
    container.innerHTML =
      '<p class="text-gray-500 text-center">No hay partidos registrados</p>';
    return;
  }

  container.innerHTML = [...groupAMatches].reverse().map(match => {
    const p1Name = getPlayerNameById(match.player1);
    const p2Name = getPlayerNameById(match.player2);
    const winnerName = getPlayerNameById(match.winner);

    return `
      <div class="bg-[var(--color-background)] p-4 rounded-lg">
        <div class="flex justify-between items-center flex-wrap gap-2">
          <div class="font-semibold">
            <span class="${match.winner === match.player1 ? 'text-green-600 font-bold' : ''}">
              ${p1Name}
            </span>
            vs
            <span class="${match.winner === match.player2 ? 'text-green-600 font-bold' : ''}">
              ${p2Name}
            </span>
          </div>
          <div class="text-sm">
            <span class="bg-[var(--color-accent)] text-white px-3 py-1 rounded-full">
              ${match.game}
            </span>
          </div>
        </div>
        <div class="text-sm text-gray-600 mt-2">
          Ganador:
          <span class="font-bold text-green-600">${winnerName}</span>
        </div>
      </div>
    `;
  }).join('');
}

