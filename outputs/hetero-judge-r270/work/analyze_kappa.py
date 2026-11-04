import json, os, collections
B = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(B, '..')
PFB = os.path.join(R, 'reference')
mine = [json.loads(l) for l in open(os.path.join(R, 'receipt-r270-hetero-dual-judge.jsonl'), encoding='utf-8')]
loc = [json.loads(l) for l in open(os.path.join(PFB, 'receipt-r269-local-dual-judge.jsonl'), encoding='utf-8')]

def norm(c):  # map 'sNN' -> 'stageNN'
    return c.replace('/s0', '/stage0')

def index(rows):
    d = {}
    for r in rows:
        for it in r['items']:
            d[(norm(r['cell']), r['judge'][:2], it['id'].replace('-', ' '))] = it['verdict']
    return d

mi, li = index(mine), index(loc)
print('mine verdicts', len(mi), 'local verdicts', len(li))
def kappa(pairs):
    n = len(pairs)
    if n == 0: return None, 0
    cats = ['pass', 'fail']
    po = sum(1 for a, b in pairs if a == b) / n
    pa = {c: sum(1 for a, _ in pairs if a == c) / n for c in cats}
    pb = {c: sum(1 for _, b in pairs if b == c) / n for c in cats}
    pe = sum(pa[c] * pb[c] for c in cats)
    return (po - pe) / (1 - pe) if pe < 1 else float('nan'), po

for j in ['J1', 'J2']:
    keys = [k for k in mi if k[1] == j and (k[0], j, k[2]) and (k[0], j, k[2]) in li and k[0] and True]
    keys = [k for k in mi if k[1] == j and (k[0], j, k[2]) in li]
    pairs = [(mi[k], li[(k[0], j, k[2])]) for k in keys]
    only_mine = [k for k in mi if k[1] == j and (k[0], j, k[2]) not in li]
    only_loc = [k for k in li if k[1] == j and (k[0], j, k[2]) not in mi]
    kap, po = kappa(pairs)
    print('  only_mine_ids', sorted(k[0].split('/')[-1]+':'+k[2] for k in only_mine)); print('  only_local_ids', sorted(k[0].split('/')[-1]+':'+k[2] for k in only_loc))
    cnt=collections.Counter((mi[k],li[(k[0],j,k[2])]) for k in keys); print('  confusion (mine,local):', dict(cnt))
    print(j, 'matched', len(pairs), 'only_mine', len(only_mine), 'only_local', len(only_loc),
          'agree', round(po, 4), 'kappa', round(kap, 4))
    # per-cell agreement
    per = collections.defaultdict(list)
    for k in keys:
        per[k[0]].append((mi[k], li[(k[0], j, k[2])]))
    for c in sorted(per):
        kk, pp = kappa(per[c])
        print('   ', c, 'n', len(per[c]), 'agree', round(pp, 3), 'kappa', None if kk is None else round(kk, 3))
