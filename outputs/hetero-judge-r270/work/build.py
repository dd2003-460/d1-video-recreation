import json,glob,os,sys
base=os.path.dirname(os.path.abspath(__file__))
out_path=os.path.join(base,'..','receipt-r270-hetero-dual-judge.jsonl')
items_all=json.load(open(os.path.join(base,'..','inputs','item_lists.json'),encoding='utf-8'))
def cell_of(fn):
    return os.path.basename(fn)[:-4].replace('__','/')
rows=[]
for fn in sorted(glob.glob(os.path.join(base,'*.tsv'))):
    cell=cell_of(fn)
    key=cell
    lines=[l.rstrip('\n') for l in open(fn,encoding='utf-8') if l.strip()]
    specs={}
    for l in lines:
        p=l.split('|')
        specs[p[0]]=p
    ids=items_all.get(key)
    if ids is None: print('NO_KEY',key); continue
    missing=[i for i in ids if i not in specs]
    extra=[i for i in specs if i not in ids]
    if missing or extra: print('MISMATCH',key,'missing',missing,'extra',extra)
    j1=[];j2=[]
    for i in ids:
        if i not in specs: continue
        p=specs[i]
        t1=[x for x in p[2].split(',') if x] if len(p)>2 else []
        j1.append({'id':i,'verdict':p[1],'tests_failed':t1,'note':p[5] if len(p)>5 else ''})
        b2=[x for x in p[4].split(',') if x] if len(p)>4 else []
        j2.append({'id':i,'verdict':p[3],'bottom_lines_triggered':b2,'note':p[6] if len(p)>6 else ''})
    s1=sum(1 for x in j1 if x['verdict']=='pass'); s2=sum(1 for x in j2 if x['verdict']=='pass')
    rows.append({'cell':cell,'judge':'J1-strict-v3','items':j1,'summary':{'total':len(j1),'passed':s1},'model_identity':'Arena Agent Mode（底层模型不公开）'})
    rows.append({'cell':cell,'judge':'J2-lenient-v3','items':j2,'summary':{'total':len(j2),'passed':s2},'model_identity':'Arena Agent Mode（底层模型不公开）'})
    print(cell, 'J1',s1,'/',len(j1),'J2',s2,'/',len(j2))
with open(out_path,'w',encoding='utf-8') as f:
    for r in rows: f.write(json.dumps(r,ensure_ascii=False)+'\n')
print('wrote',len(rows),'rows')
