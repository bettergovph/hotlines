import subprocess
from pathlib import Path
import re

REPO_ROOT = Path(__file__).resolve().parents[1]
TARGET = REPO_ROOT / 'public' / 'data' / 'hotlines.json'

# Get blame info per line (porcelain for easy parsing)
proc = subprocess.run(['git', 'blame', '--line-porcelain', str(TARGET)], cwd=REPO_ROOT, capture_output=True, text=True, check=True)
blame = proc.stdout.splitlines()

# Map line number (1-based) -> author-time (YYYY-MM-DD)
line_dates = {}
current_line = 0
current_date = None
for line in blame:
    if line.startswith('author-time '):
        # Unix timestamp; we'll also read author-time (unix) and author-tz; but better use author-time + author-timezone? porcelain gives author-time as unix
        ts = int(line.split()[1])
        import datetime
        current_date = datetime.datetime.utcfromtimestamp(ts).date().isoformat()
    elif re.match(r'^\t', line):
        # content line; increment line counter and store date
        current_line += 1
        if current_date:
            line_dates[current_line] = current_date
        else:
            line_dates[current_line] = None
        current_date = None

# Read file lines
with open(TARGET, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Iterate and update lastVerified values per object block
updated_lines = []
inside_object = False
object_start_line = None
hotline_name_line = None
hotline_date = None
last_verified_line_idx_in_block = None

for idx, line in enumerate(lines, start=1):
    stripped = line.strip()
    # Detect start of an object under hotlines array
    if stripped == '{':
        inside_object = True
        object_start_line = idx
        hotline_name_line = None
        hotline_date = None
        last_verified_line_idx_in_block = None
    if inside_object:
        if '"hotlineName"' in line:
            hotline_name_line = idx
            hotline_date = line_dates.get(idx)
        if '"lastVerified"' in line:
            last_verified_line_idx_in_block = idx
            # Replace the value with the hotline_date if available else keep
            if hotline_date:
                new_line = re.sub(r'("lastVerified"\s*:\s*)".*?"', f'\\1"{hotline_date}"', line)
                line = new_line
        # Detect end of object
        if stripped == '},' or stripped == '}':
            inside_object = False
            object_start_line = None
            hotline_name_line = None
            hotline_date = None
            last_verified_line_idx_in_block = None
    updated_lines.append(line)

with open(TARGET, 'w', encoding='utf-8') as f:
    f.writelines(updated_lines)

print('Updated lastVerified values based on git blame dates.')
