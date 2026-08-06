#!/usr/bin/env python3
"""
Mock-server för Uppsala Schackfestival Live-sida.
Simulerar LiveChessCloud API med riktiga partier som spelas i realtid.

Kör med: python3 mock-server.py
Serverar på: http://localhost:8081

Varje bräde får ett nytt drag var 6:e sekund.
Bord 2 och 3 i varje grupp börjar med ett försprång (mer avancerade positioner).
"""

import json, time, re
from http.server import HTTPServer, BaseHTTPRequestHandler

SERVER_START = time.time()
SECS_PER_MOVE = 6   # nytt drag var 6:e sekund

# ── Spelardata ────────────────────────────────────────────────
GROUPS = {
  "b9c6cd2c-e05d-4b1a-a4db-25c98c291b52": {  # Grupp 1
    "name": "Uppsala Chess Festival 2026 – Weekend 1 – grupp 1",
    "pairings": [
      {"white": {"fname":"Erik",    "lname":"Lindqvist", "rating":"2145","title":"FM"},
       "black": {"fname":"Anna",    "lname":"Svensson",  "rating":"2089","title":""}},
      {"white": {"fname":"Johan",   "lname":"Bergström",  "rating":"2034","title":""},
       "black": {"fname":"Maria",   "lname":"Nilsson",   "rating":"1998","title":""}},
      {"white": {"fname":"Peter",   "lname":"Larsson",   "rating":"1956","title":""},
       "black": {"fname":"Sofia",   "lname":"Andersson", "rating":"1943","title":""}},
    ]
  },
  "8d579e31-c216-43c4-817e-597ba58db845": {  # Grupp 2
    "name": "Uppsala Chess Festival 2026 – Weekend 1 – grupp 2",
    "pairings": [
      {"white": {"fname":"Lars",    "lname":"Ekström",   "rating":"1921","title":""},
       "black": {"fname":"Karin",   "lname":"Magnusson", "rating":"1904","title":""}},
      {"white": {"fname":"Henrik",  "lname":"Johansson", "rating":"1888","title":""},
       "black": {"fname":"Eva",     "lname":"Persson",   "rating":"1871","title":""}},
      {"white": {"fname":"Marcus",  "lname":"Holm",      "rating":"1855","title":""},
       "black": {"fname":"Lena",    "lname":"Eriksson",  "rating":"1838","title":""}},
    ]
  },
  "3e1dead3-0b84-4d70-8dfe-34b099bd019b": {  # Grupp 3
    "name": "Uppsala Chess Festival 2026 – Weekend 1 – grupp 3",
    "pairings": [
      {"white": {"fname":"Oscar",   "lname":"Strand",    "rating":"1820","title":""},
       "black": {"fname":"Emma",    "lname":"Björk",     "rating":"1803","title":""}},
      {"white": {"fname":"Anders",  "lname":"Lundgren",  "rating":"1791","title":""},
       "black": {"fname":"Sara",    "lname":"Westman",   "rating":"1778","title":""}},
      {"white": {"fname":"Mikael",  "lname":"Lindén",    "rating":"1765","title":""},
       "black": {"fname":"Helena",  "lname":"Karlsson",  "rating":"1750","title":""}},
    ]
  },
  "b0741cd4-79ba-4ad3-990b-4e766946ca16": {  # Grupp 4
    "name": "Uppsala Chess Festival 2026 – Weekend 1 – grupp 4",
    "pairings": [
      {"white": {"fname":"Tobias",  "lname":"Norén",     "rating":"1735","title":""},
       "black": {"fname":"Linda",   "lname":"Sjöberg",   "rating":"1720","title":""}},
      {"white": {"fname":"Fredrik", "lname":"Åberg",     "rating":"1710","title":""},
       "black": {"fname":"Annika",  "lname":"Gustafsson","rating":"1695","title":""}},
      {"white": {"fname":"Daniel",  "lname":"Månsson",   "rating":"1682","title":""},
       "black": {"fname":"Maja",    "lname":"Lindström", "rating":"1670","title":""}},
    ]
  },
}

# ── Schackpartier (SAN-drag) ──────────────────────────────────
# Fyra klassiska/intressanta partier som används på borden.
GAME_MOVES = [
  # Parti A – Ruy Lopez, 45 drag
  ["e4","e5","Nf3","Nc6","Bb5","a6","Ba4","Nf6","O-O","Be7","Re1","b5","Bb3","d6",
   "c3","O-O","h3","Nb8","d4","Nbd7","Nbd2","Bb7","Bc2","c5","d5","c4","Nf1","Nc5",
   "Ne3","g6","Nd2","Nh5","g3","Nf6","Kg2","h5","Nf3","Nfd7","Nh4","Qe8","Nhf5",
   "Bxf5","Nxf5","gxf5","exf5","Nf6","Qd3","Nh7","f6","Nxf6","Rxe5","dxe5","Qxe5"],

  # Parti B – Siciliansk Dragon, 40 drag
  ["e4","c5","Nf3","d6","d4","cxd4","Nxd4","Nf6","Nc3","g6","Be3","Bg7","f3","O-O",
   "Qd2","Nc6","Bc4","Bd7","O-O-O","Rb8","Bb3","Ne5","h4","h5","Bg5","Rc8","Kb1",
   "Re8","g4","hxg4","fxg4","Nc4","Bxc4","Rxc4","g5","Ne8","Nd5","Nc7","Nxc7","Rxc7",
   "Bh6","Bxh6","gxh6","Rxh6","h5","f5"],

  # Parti C – Damgambit, 38 drag
  ["d4","d5","c4","e6","Nc3","Nf6","Bg5","Be7","e3","O-O","Nf3","Nbd7","Rc1","c6",
   "Bd3","dxc4","Bxc4","Nd5","Bxe7","Qxe7","O-O","Nxc3","Rxc3","e5","Qc2","exd4",
   "Nxd4","Nf6","Re1","Rd8","Nf5","Qd7","Rce3","g6","Nh6+","Kh8","Rxe8+","Nxe8",
   "Bxf7","Rxf7","Rxe8+","Kg7","Qe4","Rf6","Nf5+"],

  # Parti D – Kungsgambiten (Odödliga partiet), 23 drag
  ["e4","e5","f4","exf4","Bc4","Qh4+","Kf1","b5","Bxb5","Nf6","Nf3","Qh6","d3","Nh5",
   "Nh4","Qg5","Nf5","c6","g4","Nf6","Rg1","cxb5","h4","Qg6","h5","Qg5","Qf3","Ng8",
   "Bxf4","Qf6","Nc3","Bc5","Nd5","Qxb2","Bd6","Bxg1","e5","Qxa1+","Ke2","Na6",
   "Nxg7+","Kd8","Qf6+","Nxf6","Be7#"],
]

# Bord 1 börjar vid drag 0, bord 2 vid drag 12, bord 3 vid drag 22
BOARD_OFFSETS = [0, 12, 22]
# Vilket parti används per grupp/bord (rotation)
def game_for(group_idx, board_idx):
  return GAME_MOVES[(group_idx + board_idx) % len(GAME_MOVES)]

def moves_so_far(group_idx, board_idx):
  offset = BOARD_OFFSETS[board_idx]
  elapsed = time.time() - SERVER_START
  n = offset + int(elapsed / SECS_PER_MOVE)
  moves = game_for(group_idx, board_idx)
  n = min(n, len(moves))
  return moves[:n], n >= len(moves)

def format_move(san, clock_white, clock_black):
  return f"{san} {clock_white}+0"

def build_game_json(group_idx, board_idx):
  raw_moves, finished = moves_so_far(group_idx, board_idx)
  base_clock = 3600
  move_list = []
  w_clock = base_clock
  b_clock = base_clock
  for i, san in enumerate(raw_moves):
    dec = 8 + (i % 5)  # varierar tidsåtgång lite
    if i % 2 == 0:
      w_clock = max(0, w_clock - dec)
      move_list.append(f"{san} {w_clock}+0")
    else:
      b_clock = max(0, b_clock - dec)
      move_list.append(f"{san} {b_clock}+0")

  is_live = not finished
  result = "*"
  if finished:
    moves = game_for(group_idx, board_idx)
    last = moves[-1]
    if "#" in last:
      result = "1-0" if len(moves) % 2 == 1 else "0-1"
    else:
      result = "*"
    is_live = False

  return {
    "moves": move_list,
    "result": result,
    "live": is_live,
    "clock": {
      "white": w_clock,
      "black": b_clock,
      "time": int(time.time() * 1000),
      "run": is_live and len(raw_moves) > 0
    }
  }


class MockHandler(BaseHTTPRequestHandler):
  def log_message(self, fmt, *args):
    pass  # tysta loggarna

  def do_OPTIONS(self):
    self.send_response(200)
    self._cors()
    self.end_headers()

  def do_GET(self):
    path = self.path.split("?")[0]

    # Hitta TID i URL
    tids = list(GROUPS.keys())
    group_idx = next((i for i, tid in enumerate(tids) if tid in path), None)

    data = None

    if "tournament.json" in path and group_idx is not None:
      grp = GROUPS[tids[group_idx]]
      data = {"name": grp["name"], "location": "Uppsala", "tcs": "3600+0"}

    elif "index.json" in path and group_idx is not None:
      grp = GROUPS[tids[group_idx]]
      data = {"pairings": grp["pairings"]}

    elif "game-" in path and group_idx is not None:
      m = re.search(r"game-(\d+)", path)
      board_num = int(m.group(1)) if m else 1
      board_idx = min(board_num - 1, 2)
      data = build_game_json(group_idx, board_idx)

    if data is None:
      self.send_response(404)
      self._cors()
      self.end_headers()
      return

    body = json.dumps(data).encode()
    self.send_response(200)
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(body)))
    self._cors()
    self.end_headers()
    self.wfile.write(body)

  def _cors(self):
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")


if __name__ == "__main__":
  port = 8081
  print(f"🟢  Mock-server startad: http://localhost:{port}")
  print(f"    Nytt drag var {SECS_PER_MOVE}:e sekund per bord.")
  print(f"    Bord 2 och 3 börjar med försprång (mer avancerade positioner).")
  print(f"    Avsluta med Ctrl+C\n")
  HTTPServer(("", port), MockHandler).serve_forever()
