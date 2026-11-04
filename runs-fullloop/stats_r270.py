# -*- coding: utf-8 -*-
import json, sys
from itertools import product
sys.path.insert(0,'/home/user/judge-work')
import judge_core as J
FL='/home/user/pfb/experiments/T8-matrix/runs/c3-v3/runs-fullloop'
NEW=[json.loads(l) for l in open(FL+'/arena-hetero-judge-r270.jsonl')]
LOCAL=[json.loads(l) for l in open(FL+'/receipt-r269-local-dual-judge.jsonl')]
R268=json.load(open(FL+'/receipt-r268-same-source-replay.json'))

CFG=['A-full','B-nofreeze','B-none']; DOM=['D1-meeting-room','D2-file-collab']
def key(cell,judge): 
    cfg,dom,st=cell.split('/'); return (cfg,dom,st)
JUDGES=['J1-strict-v3','J2-lenient-v3']

new_rate={}
for r in NEW:
    cfg,dom,st=r['cell'].split('/')
    new_rate[(cfg,dom,st,r['judge'])]=r['summary']['passed']/r['summary']['total']

# 本地 r269（逐条目可比）
def norm_st(x):
    if x.startswith('s') and x[1:].isdigit(): return 'stage0'+x[1:].lstrip('0') and 'stage0'+str(int(x[1:]))
    return x
loc_items={}
for r in LOCAL:
    cfg,dom,st=r['cell'].split('/')
    loc_items[(cfg,dom,norm_st(st),r['judge'])]={i['id']:i['verdict'] for i in r['items']}
new_items={}
for r in NEW:
    cfg,dom,st=r['cell'].split('/')
    new_items[(cfg,dom,st,r['judge'])]={i['id']:i['verdict'] for i in r['items']}

def kappa(pairs):
    n=len(pairs)
    if n==0: return None,None,0
    po=sum(1 for a,b in pairs if a==b)/n
    pa=sum(1 for a,b in pairs if a=='pass')/n; pb=sum(1 for a,b in pairs if b=='pass')/n
    pe=pa*pb+(1-pa)*(1-pb)
    if pe>=1: return po,0.0,n
    return po,(po-pe)/(1-pe),n

def kappa_cells(judge):
    rows=[]
    for cfg,dom in product(CFG,DOM):
        for st in ['stage01','stage02','stage03']:
            k=(cfg,dom,st,judge)
            if k not in loc_items or k not in new_items: continue
            ids=[i for i in new_items[k] if i in loc_items[k]]
            pairs=[(new_items[k][i],loc_items[k][i]) for i in ids]
            po,kap,n=kappa(pairs)
            rows.append({'cell':f'{cfg}/{dom}/{st}','n':n,'p_observed':round(po,4),
                         'kappa':None if kap is None else round(kap,4)})
    return rows

# J1 vs J2（我内部）
def kappa_j1j2():
    pairs=[]
    for cfg,dom in product(CFG,DOM):
        for st in ['stage01','stage02','stage03']:
            a=new_items[(cfg,dom,st,'J1-strict-v3')]; b=new_items[(cfg,dom,st,'J2-lenient-v3')]
            for i in a:
                if i in b: pairs.append((a[i],b[i]))
    return kappa(pairs)

# G2 spread
def spread(rate_map):
    out={}
    for dom in DOM:
        for st in ['stage01','stage02','stage03']:
            for j in JUDGES:
                s={c:rate_map[(c,dom,st,j)] for c in CFG}
                sp=max(s.values())-min(s.values())
                out[(dom,st,j)]={'scores':{c:round(v,4) for c,v in s.items()},
                                 'spread':round(sp,4),'verdict':'PASS' if sp>=0.1 else 'FAIL'}
    return out
new_spread=spread(new_rate)
loc_rate={}
for r in LOCAL:
    cfg,dom,st=r['cell'].split('/'); st=norm_st(st)
    loc_rate[(cfg,dom,st,r['judge'])]=r['summary']['passed']/r['summary']['total']
loc_spread=spread(loc_rate)

r268_rate={}
for d,st3 in R268['scores'].items():
    cfg,dom=d.split('|')
    for sk,v in st3.items():
        st='stage0'+sk[-1]
        r268_rate[(cfg,dom,st,'J1-strict-v3')]=int(v['J1'].split('/')[0])/int(v['J1'].split('/')[1])
        r268_rate[(cfg,dom,st,'J2-lenient-v3')]=int(v['J2'].split('/')[0])/int(v['J2'].split('/')[1])
r268_spread=spread(r268_rate)

if __name__=='__main__':
    json.dump({'new':{f'{k[0]}|{k[1]}|{k[2]}|{k[3]}':v for k,v in new_rate.items()},
               'local':{f'{k[0]}|{k[1]}|{k[2]}|{k[3]}':v for k,v in loc_rate.items()},
               'r268':{f'{k[0]}|{k[1]}|{k[2]}|{k[3]}':v for k,v in r268_rate.items()},
               'new_spread':{f'{k[0]}|{k[1]}|{k[2]}':v for k,v in new_spread.items()},
               'loc_spread':{f'{k[0]}|{k[1]}|{k[2]}':v for k,v in loc_spread.items()},
               'r268_spread':{f'{k[0]}|{k[1]}|{k[2]}':v for k,v in r268_spread.items()},
               'kappa_J1':kappa_cells('J1-strict-v3'),'kappa_J2':kappa_cells('J2-lenient-v3'),
               'kappa_J1J2':kappa_j1j2()}, open('/home/user/judge-work/stats.json','w'), ensure_ascii=False, indent=1)
    print('k J1J2', kappa_j1j2())
    for j in JUDGES:
        rows=kappa_cells(j); ks=[r['kappa'] for r in rows if r['kappa'] is not None]
        print(j,'mean kappa', round(sum(ks)/len(ks),4), 'cells',len(rows))
    print('new spread PASS', sum(1 for v in new_spread.values() if v['verdict']=='PASS'),'/12')
    print('local spread PASS', sum(1 for v in loc_spread.values() if v['verdict']=='PASS'),'/12')
    print('r268 spread PASS', sum(1 for v in r268_spread.values() if v['verdict']=='PASS'),'/12')

def pooled(judge):
    pairs=[]
    for cfg,dom in product(CFG,DOM):
        for st in ['stage01','stage02','stage03']:
            k=(cfg,dom,st,judge)
            for i,v in new_items[k].items():
                if i in loc_items[k]: pairs.append((v,loc_items[k][i]))
    po,kap,n=kappa(pairs)
    return {'n':n,'p_observed':round(po,4),'kappa':round(kap,4),'pabak':round(2*po-1,4)}

def pabak_cells(judge):
    out=[]
    for cfg,dom in product(CFG,DOM):
        for st in ['stage01','stage02','stage03']:
            k=(cfg,dom,st,judge)
            ids=[i for i in new_items[k] if i in loc_items[k]]
            po=sum(1 for i in ids if new_items[k][i]==loc_items[k][i])/len(ids)
            out.append(round(2*po-1,4))
    return out

if __name__=='__main__':
    print('\n=== pooled ===')
    extra={}
    for j in JUDGES:
        p=pooled(j); pb=pabak_cells(j)
        extra[j]={'pooled':p,'pabak_mean':round(sum(pb)/len(pb),4)}
        print(j,p,'pabak_mean',extra[j]['pabak_mean'])
    # Δ vs local / vs r268
    rows=[]
    for cfg,dom in product(CFG,DOM):
        for st in ['stage01','stage02','stage03']:
            for j in JUDGES:
                k=(cfg,dom,st,j)
                rows.append({'cell':f'{cfg}/{dom}/{st}','judge':j,
                             'new':round(new_rate[k],4),'local_r269':round(loc_rate[k],4),
                             'r268':round(r268_rate[k],4),
                             'delta_vs_local':round(new_rate[k]-loc_rate[k],4),
                             'delta_vs_r268':round(new_rate[k]-r268_rate[k],4)})
    import statistics
    print('\nmean |Δ| vs local', round(statistics.mean(abs(r['delta_vs_local']) for r in rows),4))
    print('mean |Δ| vs r268 ', round(statistics.mean(abs(r['delta_vs_r268']) for r in rows),4))
    print('max |Δ| vs local', max(rows,key=lambda r:abs(r['delta_vs_local']))['cell'],
          max(abs(r['delta_vs_local']) for r in rows))
    s=json.load(open('stats.json')); s['extra']=extra; s['compare_rows']=rows
    s['mean_abs_delta']={'vs_local':round(statistics.mean(abs(r['delta_vs_local']) for r in rows),4),
                         'vs_r268':round(statistics.mean(abs(r['delta_vs_r268']) for r in rows),4)}
    json.dump(s,open('stats.json','w'),ensure_ascii=False,indent=1)
