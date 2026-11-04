import json, os, collections, math
B = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(B, '..')
PFB = os.path.join(R, 'reference')
mine = [json.loads(l) for l in open(os.path.join(R, 'receipt-r270-hetero-dual-judge.jsonl'), encoding='utf-8')]
loc = [json.loads(l) for l in open(os.path.join(PFB, 'receipt-r269-local-dual-judge.jsonl'), encoding='utf-8')]
r268 = json.load(open(os.path.join(PFB, 'receipt-r268-same-source-replay.json'), encoding='utf-8'))

def key_id(s): return s.replace('-', ' ')
def stage_norm(c): return c.replace('/s0', '/stage0')

# per-cell pass counts (mine)
M = {}
for r in mine:
    M[(r['cell'], r['judge'][:2])] = (r['summary']['passed'], r['summary']['total'])
# local
L = {}
for r in loc:
    c = stage_norm(r['cell'])
    L[(c, r['judge'][:2])] = (sum(1 for i in r['items'] if i['verdict']=='pass'), len(r['items']))
# r268 scores: 'A-full|D1-meeting-room' -> S01 -> J1 'x/y'
S268 = {}
for cfgdom, stages in r268['scores'].items():
    cfg, dom = cfgdom.split('|')
    for st, js in stages.items():
        for j in ('J1','J2'):
            p, t = js[j].split('/')
            S268[(f"{cfg}/{dom}/stage{st[1:]}", j)] = (int(p), int(t))

cells = [f"{c}/{d}/stage{s:02d}" for c in ['A-full','B-nofreeze','B-none'] for d in ['D1-meeting-room','D2-file-collab'] for s in [1,2,3]]

def kappa(pairs):
    n=len(pairs)
    if n==0: return None
    cats=['pass','fail']
    po=sum(a==b for a,b in pairs)/n
    pa={c:sum(a==c for a,_ in pairs)/n for c in cats}
    pb={c:sum(b==c for _,b in pairs)/n for c in cats}
    pe=sum(pa[c]*pb[c] for c in cats)
    if pe>=1: return None
    return (po-pe)/(1-pe)

# item-level pairs
def verdicts(rows):
    d={}
    for r in rows:
        for it in r['items']:
            d[(stage_norm(r['cell']), r['judge'][:2], key_id(it['id']))]=it['verdict']
    return d
mv = verdicts(mine); lv = verdicts(loc)

print('## per-cell')
print('cell | mine J1 | mine J2 | r268 J1 | r268 J2 | d J1 pp | d J2 pp | r269 J1 | r269 J2 | k vs r269 J1 | k vs r269 J2 | k mine J1-J2 (cell)')
rowsout=[]
for c in cells:
    row={'cell':c}
    for j in ('J1','J2'):
        p,t=M[(c,j)]; row['mine_'+j]=f"{p}/{t}"; row['mine_'+j+'_pct']=round(100*p/t,1)
        if (c,j) in S268:
            q,u=S268[(c,j)]; row['r268_'+j]=f"{q}/{u}"; row['d_'+j]=round(100*(p/t-q/u),1)
        if (c,j) in L:
            q,u=L[(c,j)]; row['r269_'+j]=f"{q}/{u}"
    # kappa vs local per judge (cell)
    for j in ('J1','J2'):
        pairs=[(mv[(c,j,i)], lv[(c,j,i)]) for (cc,jj,i) in mv if cc==c and jj==j and (c,j,i) in lv]
        k=kappa(pairs); row['k_r269_'+j]=None if k is None else round(k,3); row['n_r269_'+j]=len(pairs)
    # inter-judge kappa mine
    pairs=[]
    for (cc,jj,i),v in mv.items():
        if cc==c and jj=='J1':
            pairs.append((v, mv[(c,'J2',i)]))
    k=kappa(pairs); row['k_mine_J1J2']=None if k is None else round(k,3)
    rowsout.append(row)
    print(f"{c} | {row['mine_J1']} ({row['mine_J1_pct']}%) | {row['mine_J2']} ({row['mine_J2_pct']}%) | {row.get('r268_J1')} | {row.get('r268_J2')} | {row.get('d_J1')} | {row.get('d_J2')} | {row.get('r269_J1')} | {row.get('r269_J2')} | {row['k_r269_J1']} | {row['k_r269_J2']} | {row['k_mine_J1J2']}")

json.dump(rowsout, open(os.path.join(B,'per_cell.json'),'w'), ensure_ascii=False, indent=1)

# kappa aggregate
def mean(xs):
    xs=[x for x in xs if x is not None]; return (sum(xs)/len(xs), len(xs)) if xs else (None,0)
print('\nmean per-cell kappa vs r269:', {j: mean([r['k_r269_'+j] for r in rowsout]) for j in ('J1','J2')})
print('mean per-cell kappa mine J1 vs J2 (n_common>=4 cells):', mean([r['k_mine_J1J2'] for r in rowsout]))
allp={j:[(mv[k], lv[(k[0],j,k[2])]) for k in mv if k[1]==j and (k[0],j,k[2]) in lv] for j in ('J1','J2')}
print('pooled kappa vs r269:', {j:(round(kappa(allp[j]),4), len(allp[j])) for j in allp})
print('pooled kappa mine J1 vs J2:', round(kappa([(mv[k], mv[(k[0],'J2',k[2])]) for k in mv if k[1]=='J1']),4))

# totals
tot={}
for j in ('J1','J2'):
    p=sum(M[(c,j)][0] for c in cells); t=sum(M[(c,j)][1] for c in cells); tot[j]=(p,t)
print('totals mine', tot)
tot268={j:(sum(S268[(c,j)][0] for c in cells), sum(S268[(c,j)][1] for c in cells)) for j in ('J1','J2')}
print('totals r268', tot268)
totl={j:(sum(L[(c,j)][0] for c in cells), sum(L[(c,j)][1] for c in cells)) for j in ('J1','J2')}
print('totals r269', totl)

# G2 spreads
print('\n## G2 spread (max-min pass rate across 3 configs; PASS if >0)')
def g2(src):
    out={}
    for dom in ['D1-meeting-room','D2-file-collab']:
        for s in [1,2,3]:
            for j in ('J1','J2'):
                vals={}
                for cfg in ['A-full','B-nofreeze','B-none']:
                    c=f"{cfg}/{dom}/stage{s:02d}"
                    p,t=src[(c,j)]
                    vals[cfg]=p/t
                sp=max(vals.values())-min(vals.values())
                out[f"{dom}_S{s:02d}_{j}"]=(round(sp,4), 'PASS' if sp>0 else 'FAIL', {k:round(v,3) for k,v in vals.items()})
    return out
G_m=g2(M); G_268=g2(S268); G_269=g2(L)
for k in G_m:
    print(k, 'mine', G_m[k][0], G_m[k][1], G_m[k][2], '| r268', G_268[k][0], G_268[k][1], '| r269', G_269[k][0], G_269[k][1])
print('G2 PASS counts: mine', sum(v[1]=='PASS' for v in G_m.values()), '/12; r268', sum(v[1]=='PASS' for v in G_268.values()), '/12; r269', sum(v[1]=='PASS' for v in G_269.values()),'/12')
print('mean spread mine J1', round(sum(G_m[k][0] for k in G_m if k.endswith('J1'))/6,4), 'J2', round(sum(G_m[k][0] for k in G_m if k.endswith('J2'))/6,4))
print('J1 mean diff sum+J2 mean diff sum (per domain):')
for dom in ['D1-meeting-room','D2-file-collab']:
    print(dom, 'J1 spread mean', round(sum(G_m[f"{dom}_S{s:02d}_J1"][0] for s in [1,2,3])/3,4), 'J2 spread mean', round(sum(G_m[f"{dom}_S{s:02d}_J2"][0] for s in [1,2,3])/3,4))
json.dump({'G2_mine':G_m,'G2_r268':G_268,'G2_r269':G_269}, open(os.path.join(B,'g2.json'),'w'), ensure_ascii=False, indent=1)
