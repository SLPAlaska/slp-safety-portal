#!/usr/bin/env python3
"""Generate the inv_question_banks / inv_question_bank seed SQL from the
content spec (slp-incident-question-banks-FULL.md).

Usage: python3 scripts/build-inv-question-seed.py docs/investigation-question-banks-FULL.md <out.sql>

The markdown is the source of truth for wording. This script only parses it:
it does not invent questions. A handful of rows whose answer column says just
"chips" without listing them get explicit options from CHIP_OVERRIDES below.
"""
import json, re, sys

src, out = sys.argv[1], sys.argv[2]
md = open(src, encoding='utf-8').read()

BANK_META = {
  'core': ('Universal core (every investigation)', 'core', 0),
  'hand_ppe': ('Hand / finger / PPE', 'hazard', 10),
  'chemical': ('Chemical / fluid exposure', 'hazard', 20),
  'vehicle': ('Vehicle / mobile equipment', 'hazard', 30),
  'slip_trip_fall': ('Slip, trip, fall (incl. from height)', 'hazard', 40),
  'stored_energy': ('Stored energy / LOTO / pressure', 'hazard', 50),
  'manual_handling': ('Manual handling / strain', 'hazard', 60),
  'line_of_fire': ('Line of fire / struck-by / caught-between / dropped object', 'hazard', 70),
  'lifting_rigging': ('Crane / hoist / rigging / suspended load / wireline mast', 'hazard', 80),
  'confined_space': ('Confined space', 'hazard', 90),
  'hot_work': ('Hot work / fire / explosion', 'hazard', 100),
  'spill_env': ('Spill / environmental', 'hazard', 110),
  'electrical': ('Electrical', 'hazard', 120),
  'excavation_trench': ('Excavation / trenching', 'hazard', 130),
  'wildlife_bear': ('Wildlife / bear / animal', 'hazard', 140),
  'weather_cold': ('Weather / cold stress / heat', 'hazard', 150),
  'water_drowning_marine': ('Water / marine / dock', 'hazard', 160),
  'aviation_helicopter': ('Aviation / helicopter', 'hazard', 170),
  'property_damage_no_injury': ('Property damage (no injury)', 'hazard', 180),
  'near_miss_good_catch': ('Near miss / good catch', 'hazard', 190),
  'psychological_violence_harassment': ('Psychological safety / violence / harassment', 'hazard', 200),
  'other': ('Other / not listed', 'hazard', 210),
  'culture': ('Supervision & shop culture', 'culture', 900),
  'rootcause': ('Root cause & close-out', 'rootcause', 1000),
}

# Codes that collide between banks get a bank prefix (lifting R1.. vs rootcause R1..)
RENAME = {'lifting_rigging': lambda c: 'LR' + c[1:] if re.fullmatch(r'R\d+', c) else c}

MULTI = {'U2','U10','U11','H1','V6','S1','M3','M6','L1','K6','WC2'}

CHIP_OVERRIDES = {
  'V6': ['Phone', 'Radio', 'Passenger', 'Schedule anxiety', 'Eating/drinking', 'None', 'Other'],
  'S1': ['Ice/snow', 'Oil/fluid', 'Mud', 'Grating', 'Stairs', 'Cord/hose across path', 'Uneven ground', 'Other'],
  'M3': ['Stairs', 'Ice', 'Long distance', 'Doorway/tight space', 'Uneven ground', 'Clear, short route'],
  'M6': ['Twisting', 'Reaching', 'Below knees', 'Above shoulders', 'One-handed', 'Neutral posture'],
  'L1': ['Load', 'Tool', 'Vehicle', 'Pressure release', 'Swinging object', 'Falling object', 'Other'],
  'C7': ['Yes — routinely', 'Yes — occasionally', 'First time', 'Unknown'],
  'K6': ['Schedule', 'Client', 'Pay/bonus', 'Crew size', 'Weather window', 'None'],
  'S9': ['Right ladder, secured', 'Wrong ladder type', 'Not secured / not 4:1', 'Should have been a lift/scaffold', 'No ladder involved'],
  'NM4': ['Within arm\u2019s reach', 'Within 6 ft', 'Beyond 6 ft', 'PSIF — yes', 'PSIF — no'],
  'U9': ['<1 mo', '<6 mo', '<2 yr', '2 yr+', 'Short-service employee'],
}

DEFAULT_PROBE = 'What made that possible? Has it happened before? What would have caught it?'
SHALLOW = re.compile(r"forgot|didn.t|always|faster|easier|thought|never|not available|too far|broken|someone told|not done|not used|not practical|no one trained|wrong|missing|ignored|not stocked|not owned|damaged|available but", re.I)

def clean(s):
    s = s.replace('**', '').strip()
    s = re.sub(r'(?<![\w*])\*(?!\s)([^*]+?)\*(?![\w*])', r'\1', s)  # *italic*
    return s.replace('\\|', '|').strip()

def split_options(txt):
    txt = re.sub(r'\s*\+\s*(text|note|photo|duration|source)\b.*$', '', txt).strip()
    parts = re.split(r'\s+·\s+|\s+/\s+', txt)
    return [p.strip().rstrip('.') for p in parts if p.strip()]

def parse_answer(code, ans):
    """-> (answer_type, options[list of dict], help_extra)"""
    ans = clean(ans)
    probe_text, probe_cond = None, None
    m = re.search(r'→\s*(.*)$', ans)
    if m:
        tail = m.group(1).strip()
        ans = ans[:m.start()].strip()
        pm = re.match(r'probe(?:\s+(if [^:]+))?\s*:?\s*(.*)$', tail, re.I)
        if pm:
            probe_cond = (pm.group(1) or '').strip() or None
            probe_text = pm.group(2).strip() or DEFAULT_PROBE
        else:
            probe_text = tail  # e.g. "if Yes, also load the energy bank"
            mm = re.match(r'if ([^,]+),\s*(.*)', tail, re.I)
            if mm:
                probe_cond, probe_text = 'if ' + mm.group(1), mm.group(2)[:1].upper() + mm.group(2)[1:]
    low = ans.lower()
    if code in CHIP_OVERRIDES:
        opts = CHIP_OVERRIDES[code]
    elif low.startswith('chips:'):
        opts = split_options(ans.split(':', 1)[1])
    elif re.match(r'^(text|checklist|link|auto-list|auto-load|date|schedule|product|chips\b|text/voice)', low) or not ans:
        atype = 'checklist' if low.startswith('checklist') else 'text'
        useless = re.match(r'^(text|checklist|link|auto-list|auto-load)', low)
        return atype, [], (None if (useless or not ans) else ans), probe_text
    elif '·' in ans or ' / ' in ans:
        opts = split_options(ans)
    else:
        return 'text', [], ans or None, probe_text
    # attach probe to options
    def applies(o):
        if not probe_text: return False
        if probe_cond:
            c = probe_cond[3:].strip()  # drop 'if '
            if c.lower().startswith('not '):
                x = c[4:].strip().lower()
                if any(oo.lower() == 'not ' + x for oo in opts):   # "if not done" -> the "Not done" chip
                    return o.lower() == 'not ' + x
                return o.lower() != x                              # "if not Yes" -> every chip but Yes
            targets = [t.strip().lower() for t in re.split(r'/|,| or ', c) if t.strip()]
            return any(o.lower().startswith(t) for t in targets)
        return True if code == 'U4' or not SHALLOW.search(' '.join(opts)) else bool(SHALLOW.search(o) or o.lower() == 'other')
    options = [{'value': o, 'label': o, **({'probe': probe_text} if applies(o) else {})} for o in opts]
    atype = 'multi' if code in MULTI else 'chips'
    return atype, options, None, None

def crit_info(c):
    c = clean(c)
    if not c.startswith('✔'):
        return False, None
    rest = c[1:].strip()
    if rest.startswith('if ') or rest.startswith('when '):
        return True, f'Critical {rest}. If that does not apply, mark N/A with a one-line reason.'
    if rest.startswith('≥2'):
        return True, 'Need at least 2 confidential responses before close (or the lead records why not).'
    if rest.startswith('→'):
        return True, 'Each answer here should become a corrective action in Stage 4.'
    return True, None

rows, banks_seen = [], {}
preferred = {}
cur_bank, dig = None, False
lines = md.split('\n')
header = None
for i, line in enumerate(lines):
    h = re.match(r'^##\s+.*\(`([a-z_]+)`\)', line)
    if h and h.group(1) in BANK_META:
        cur_bank, dig, header = h.group(1), False, None
        banks_seen.setdefault(cur_bank, 0)
        continue
    if re.match(r'^###\s+Universal — latent', line):
        dig = True; header = None; continue
    if re.match(r'^###\s+Private peer question', line):
        header = None; continue
    if re.match(r'^#\s+PART E', line):
        cur_bank = None; continue
    pm = re.match(r'^\*\*Preferred CA[^:]*:\*\*\s*(.+)$', line)
    if pm and cur_bank:
        preferred[cur_bank] = clean(pm.group(1)); continue
    if not cur_bank or not line.startswith('|'):
        continue
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    if cells[0] == '#':
        header = [c.lower() for c in cells]; continue
    if set(''.join(cells)) <= set('-: '):
        continue
    if not header or not re.match(r'^[A-Z]+\d+$', cells[0]):
        continue
    rec = dict(zip(header, cells))
    code = RENAME.get(cur_bank, lambda c: c)(cells[0])
    aud = [a for a in re.findall(r'IP|SUP|WIT|PEER|INV', rec.get('audience', ''))]
    prompt = clean(rec.get('question', ''))
    atype, options, help_extra, probe_text = parse_answer(code, rec.get('answer', 'text'))
    critical, crit_help = crit_info(rec.get('crit', '–'))
    helps = [h for h in [crit_help, (f'Expected answer: {help_extra}' if help_extra else None),
                         (f'Follow-up: {probe_text}' if (probe_text and not options) else None)] if h]
    banks_seen[cur_bank] += 1
    is_conf = code == 'PRIV1'
    rows.append(dict(code=code, bank=cur_bank, audience=aud or ['INV'], prompt=prompt,
                     help=' '.join(helps) or None, answer_type=atype, options=options,
                     is_critical=critical, is_dig_deeper=(dig or not critical), is_confidential=is_conf,
                     stage=4 if cur_bank == 'rootcause' else 3,
                     sort=banks_seen[cur_bank] * 10))

# culture trigger + PRIV1 metadata
for r in rows:
    if r['bank'] == 'culture':
        r['trigger'] = {'when': 'culture_block'}
    if r['code'] == 'PRIV1':
        r['audience'] = ['PEER']; r['answer_type'] = 'text'

def q(s):
    return 'null' if s is None else "'" + s.replace("'", "''") + "'"

def arr(a):
    return "array[" + ','.join(q(x) for x in a) + "]::text[]" if a else "'{}'::text[]"

out_lines = ["-- SQL 2026-10-10-29 — Interview Guide question banks seed (generated by",
             "-- scripts/build-inv-question-seed.py from slp-incident-question-banks-FULL.md).",
             "-- Upsert by code; additive. Re-running refreshes wording from the spec.", ""]
out_lines.append("insert into public.inv_question_banks (code, label, kind, preferred_ca, sort) values")
bl = []
for code, (label, kind, sort) in BANK_META.items():
    bl.append(f"  ({q(code)}, {q(label)}, {q(kind)}, {q(preferred.get(code))}, {sort})")
out_lines.append(',\n'.join(bl))
out_lines.append("on conflict (code) do update set label = excluded.label, kind = excluded.kind, preferred_ca = excluded.preferred_ca, sort = excluded.sort, updated_at = now();\n")

out_lines.append("insert into public.inv_question_bank (code, bank, audience, stage, prompt, help, answer_type, options, is_critical, is_dig_deeper, is_confidential, trigger, sort) values")
vals = []
for r in rows:
    vals.append(f"  ({q(r['code'])}, {q(r['bank'])}, {arr(r['audience'])}, {r['stage']}, {q(r['prompt'])}, {q(r['help'])}, {q(r['answer_type'])}, {q(json.dumps(r['options'], ensure_ascii=False))}::jsonb, {str(r['is_critical']).lower()}, {str(r['is_dig_deeper']).lower()}, {str(r['is_confidential']).lower()}, {q(json.dumps(r.get('trigger', {})))}::jsonb, {r['sort']})")
out_lines.append(',\n'.join(vals))
out_lines.append("on conflict (code) do update set bank = excluded.bank, audience = excluded.audience, stage = excluded.stage, prompt = excluded.prompt, help = excluded.help, answer_type = excluded.answer_type, options = excluded.options, is_critical = excluded.is_critical, is_dig_deeper = excluded.is_dig_deeper, is_confidential = excluded.is_confidential, trigger = excluded.trigger, sort = excluded.sort, version = public.inv_question_bank.version + case when public.inv_question_bank.prompt is distinct from excluded.prompt then 1 else 0 end, updated_at = now();")
open(out, 'w', encoding='utf-8').write('\n'.join(out_lines) + '\n')

summary = {b: dict(total=sum(1 for r in rows if r['bank']==b), critical=sum(1 for r in rows if r['bank']==b and r['is_critical'])) for b in BANK_META}
print(json.dumps(summary))
print('rows', len(rows), 'critical', sum(r['is_critical'] for r in rows))
missing = [b for b,v in summary.items() if v['total']==0]
if missing: print('MISSING BANKS', missing); sys.exit(1)
