import re, json
from pathlib import Path
base=Path('/home/user/pfb/experiments/T8-matrix/runs/c3-v3/runs-fullloop/pilot')
def extract_items(art):
    ids=set()
    for m in re.finditer(r"\b([A-H]\d+(?:\.\d+)?)\b",art): ids.add(m.group(1))
    for m in re.finditer(r"\b(U\d+|K\d+|Q\d+|P\d+)\b",art): ids.add(m.group(1))
    for m in re.finditer(r"\bGAP-\d+\b",art): ids.add(m.group(0))
    for m in re.finditer(r"\bOQ-\d+\b",art): ids.add(m.group(0))
    for m in re.finditer(r"\bGap[- ]?[\w-]+\b",art): ids.add(m.group(0).replace(" ","-"))
    for m in re.finditer(r"(?:主张|来源)\s*(\d+)",art): ids.add(f"Z{m.group(1)}")
    for m in re.finditer(r"(?:方案|候选)\s*([A-Z])(?=[\s：:、，])",art): ids.add(f"P-{m.group(1)}")
    return sorted(ids)
def pat_for(i):
    if i.startswith('Z') and i[1:].isdigit(): return r"(?:主张|来源)\s*"+i[1:]+r"(?!\d)"
    if i.startswith('P-') and len(i)==3: return r"(?:方案|候选)\s*"+i[2]+r"(?=[\s：:、，])"
    if i.startswith('Gap'): return re.escape(i).replace(r'\-', r'[- _]?')
    return r'(?<![\w.])'+re.escape(i)+r'(?![\w.])'
out={}
for p in sorted(base.rglob('stage*.md')):
    cell=str(p.relative_to(base))[:-3]; art=p.read_text()
    lines=[l.strip() for l in art.splitlines() if l.strip()]
    rows=[]
    for i in extract_items(art):
        hits=[l for l in lines if re.search(pat_for(i),l)]
        rows.append({'id':i,'n':len(hits),'first':hits[0][:200] if hits else None,'second':hits[1][:200] if len(hits)>1 else None})
    out[cell]=rows
json.dump(out,open('items.json','w'),ensure_ascii=False,indent=1)
for c,rows in out.items():
    nf=[r['id'] for r in rows if r['n']==0]
    print(f"{c}: {len(rows)} items, notfound={nf}")
