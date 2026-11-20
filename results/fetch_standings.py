#!/usr/bin/env python3
"""
Fetch standings for all historical Uppsala Weekend groups from member.schack.se
and save them to archive.json under a 'standings' key for each group.

Usage:
  cd results/
  python3 fetch_standings.py

Requires: requests, beautifulsoup4
  pip install requests beautifulsoup4
"""

import json
import time
import re
import sys
import os

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependencies. Run: pip install requests beautifulsoup4")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ARCHIVE_PATH = os.path.join(SCRIPT_DIR, "archive.json")

def fetch_standings(group_id):
    url = f"https://member.schack.se/ShowTournamentServlet?id={group_id}"
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "UCF-Archive/1.0"})
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
        tables = soup.find_all("table")
        for table in tables[1:]:
            rows = table.find_all("tr")
            players = []
            for row in rows[1:]:
                cells = [td.get_text(strip=True) for td in row.find_all("td") if td.get_text(strip=True)]
                if len(cells) < 5:
                    continue
                try:
                    pos = int(cells[0])
                except ValueError:
                    continue
                if pos < 1 or pos > 50:
                    continue
                name = re.sub(r"\s+", " ", cells[1]).strip()
                club = cells[2]
                rating = int(cells[3]) if cells[3].isdigit() else 0
                points = None
                for c in reversed(cells[4:]):
                    if re.match(r"^\d+\.\d$", c):
                        points = float(c)
                        break
                if name and points is not None:
                    players.append({"pos": pos, "name": name, "club": club, "rating": rating, "points": points})
            if len(players) >= 2:
                return players
    except Exception as e:
        print(f"  Error fetching group {group_id}: {e}")
    return []


def main():
    with open(ARCHIVE_PATH, encoding="utf-8") as f:
        archive = json.load(f)

    total_groups = sum(len(t["groups"]) for t in archive)
    done = 0

    for tournament in archive:
        print(f"\n{tournament['year']} {tournament['event']} ({tournament['date_sv']})")
        for group in tournament["groups"]:
            gid = group["id"]
            done += 1
            print(f"  [{done}/{total_groups}] Group {gid} ({group['label_sv']})...", end=" ", flush=True)
            standings = fetch_standings(gid)
            group["standings"] = standings
            if standings:
                print(f"{standings[0]['name']} ({standings[0]['points']} pts)")
            else:
                print("no data")
            time.sleep(0.3)

    with open(ARCHIVE_PATH, "w", encoding="utf-8") as f:
        json.dump(archive, f, ensure_ascii=False, indent=2)

    print(f"\nDone. Saved to {ARCHIVE_PATH}")


if __name__ == "__main__":
    main()
