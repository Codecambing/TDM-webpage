export interface Player {
  id: string;
  name: string;
  photo?: string;
  played?: number;
  wins?: number;
  losses?: number;
  points?: number;
}

export interface Match {
  id: string;
  player1: string;
  player2: string;
  winner: string;
  game: string;
}
