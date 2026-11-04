# -*- coding: utf-8 -*-
"""R270 异源 judge：逐条目判定数据 + 落盘/统计。
判定口径（写进 summary）见 RULES。
"""
import json, hashlib
from pathlib import Path

PFB = Path('/home/user/pfb')
FL = PFB/'experiments/T8-matrix/runs/c3-v3/runs-fullloop'
ITEMS = json.load(open('/home/user/judge-work/items.json'))

RULES = {
 "item_extraction": "brief【条目提取规则】正则，与 replay-r268-same-source.py 同版",
 "J1": "J1-strict-v3 冻结 prompt（sha 见 rubric_sha）",
 "J2": "J2-lenient-v3 冻结 prompt",
 "S01_S03_rule": "研究分解类工件（S01 因素/空缺清单，S03 行动分解）：条目为问题句/假设/带验收方式的步骤，①只在该条断言外部事实时适用；②按对象层级边界判（待研究项+验证方向=pass）",
 "S02_rule": "证据搜集类工件（S02）：条目为事实断言 → ①严格判：出现显式来源标记（URL/文档名+章节/API 引用/仓库路径/据X官方文档定价页）=B级(未实抓)=J1 pass；仅『厂商规格/价格线索/模型知识』等来源类型或品牌名=A级 fail；若标『已核验/已填补』但证据仍是模型知识 → 处置标记与证据不符 → fail",
 "J2_S02_rule": "B-1 硬底线：无 URL/文档名+章节/API/仓库路径 的可复核对象 → fail；报价类外部数字无来源 → 追加 B-2a",
}

def rubric_sha():
    p = json.load(open(PFB/'experiments/T8-matrix/runs/c3-v3/calibration/judge-prompts-rubric-v3.json'))
    return {k: v['sha256_16'] for k, v in p['prompts'].items()}

SHA = rubric_sha()

KIND_NOTES = [
 (('C1','C2','C3','C4'), '类别含代表与纳入/排除理由'),
 (('F1.','F2.','F3.','F4.','F5.','A1.','A2.','A3.','A4.'), '子因素含定义与待研究项'),
 (('F1','F2','F3','F4','F5'), '因素定义+已知/推导/待研究'),
 (('GAP-',), '空缺含子问题与阻塞判断'),
 (('Gap-','Gaps'), '空缺汇总表含影响与动作'),
 (('P-A','P-B','P-C','P-D','P-E','P-F'), '候选块含结论与不确定性'),
 (('U1','U2','U3','U4'), '未决项含影响与补全动作'),
 (('A1','A2','A3','B1','B2','B3','C1','C2','C3','D1','D2','D3','E1','E2'), '步骤含依赖与验收方式'),
]

def kind_note(i):
    for keys, note in KIND_NOTES:
        if i in keys:
            return note
    if i.startswith('Step'): return '步骤含依赖与验收方式'
    return '条目有对象且保留不确定性'

def mk(ids, verdict='pass', tests=None, note_fn=kind_note, notes=None):
    out = []
    for i in ids:
        n = (notes or {}).get(i) or note_fn(i)
        out.append({'id': i, 'verdict': verdict, 'tests_failed': tests or [], 'note': n[:30]})
    return out

def rows(cell, judge, items, model):
    passed = sum(1 for x in items if x['verdict'] == 'pass')
    return {'cell': cell, 'judge': judge, 'items': items,
            'summary': {'total': len(items), 'passed': passed},
            'model_identity': model, 'rubric_sha256_16': SHA[judge], 'batch': None}

# ------------------------------------------------------------------ 判定表
# S02 每格的 pass 集合（J1 走 B 级；J2 全 0，除 Note 说明）
S02_J1_PASS = {
 'A-full/D1-meeting-room/stage02': {'Z1': 'B级:飞书官网帮助中心，未实抓'},
 'A-full/D2-file-collab/stage02': {k: '空缺登记表，含补全动作' for k in ['Gaps','U1','U2','U3','U4']},
 'B-nofreeze/D1-meeting-room/stage02': {},
 'B-nofreeze/D2-file-collab/stage02': {},
 'B-none/D1-meeting-room/stage02': {
    'Z1': 'B级:飞书官网及产品文档，未实抓', 'Z2': 'B级:飞书开放平台文档，未实抓',
    'Z3': 'B级:飞书开放平台文档，未实抓', 'Z4': 'B级:飞书定价页历史数据，未实抓',
    'Z5': 'B级:ToS 分析，未实抓'},
 'B-none/D2-file-collab/stage02': {},
}
S02_J1_SPECIAL_FAIL = {
 'A-full/D1-meeting-room/stage02': {'Z2': '正文截断，来源2无内容'},
 'A-full/D2-file-collab/stage02': {'G2': '标已核验但仅模型知识;①无来源',
                                   'G2.1': '标已核验但仅模型知识;①无来源',
                                   'G2.2': '标已核验但仅模型知识;①无来源'},
 'B-none/D1-meeting-room/stage02': {'G1': '标已解决但证据为模型知识',
                                    'G4': '标已解决但证据为模型知识'},
}

S02_UNKNOWN_IDS = {'Gaps','U1','U2','U3','U4'}

def s02_items(cell, judge, ids):
    out = []
    passset = S02_J1_PASS[cell]
    if not judge.startswith('J1'):
        # J2：未知项登记（无外部事实断言）同样 pass；其余受 B-1/B-2a 底线 -> fail
        passset = {k: v for k, v in passset.items() if k in S02_UNKNOWN_IDS}
    spec = S02_J1_SPECIAL_FAIL.get(cell, {})
    for i in ids:
        if i in passset:
            out.append({'id': i, 'verdict': 'pass', 'tests_failed': [], 'note': passset[i][:30]})
        elif judge.startswith('J1'):
            note = spec.get(i) or '①无来源;仅产品名/数字'
            out.append({'id': i, 'verdict': 'fail', 'tests_failed': ['①'], 'note': note[:30]})
        else:
            note = 'B-1:模型知识非可复核来源'
            if i in spec: note = spec[i]
            out.append({'id': i, 'verdict': 'fail', 'bottom_lines_triggered': ['B-1'], 'note': note[:30]})
    return out

MODEL = 'arena-agent-mode (non-Qwen family; 具体家族不披露)'
S02_CELLS = [c for c in ITEMS if c.endswith('stage02')]

# 只有"被引用"而无独立条目内容（交叉引用、优先级参数、SKU、编号区间）-> ② 无独立条目
CROSSREF_FAIL = {
 'A-full/D1-meeting-room/stage03': {'C4': '仅引用S02证据编号',
   'D3': '仅引用S02证据编号', 'D4': '仅引用S02证据编号',
   'G2': '仅引用S02空缺编号', 'G7': '仅引用S01空缺编号', 'G8': '仅引用S01空缺编号'},
 'A-full/D2-file-collab/stage01': {'P0': '仅作优先级参数出现', 'P1': '仅作优先级参数出现'},
 'A-full/D2-file-collab/stage03': {'U1': '仅整段引用U1-U4', 'U2': '仅整段引用U1-U4', 'U4': '仅整段引用U1-U4'},
 'B-nofreeze/D1-meeting-room/stage01': {'P0': '仅作优先级参数出现', 'P1': '仅作优先级参数出现',
   'P2': '仅作优先级参数出现', 'P3': '仅作优先级参数出现'},
 'B-nofreeze/D1-meeting-room/stage03': {'F1.3': '仅验收标准交叉引用', 'F2.1': '仅作淘汰例引用',
   'F3': '仅在F1-F5区间提及', 'F3.1': '仅验收标准交叉引用', 'F5': '仅在F1-F5区间提及',
   'G1': '仅引用S01 Gap List', 'Gap-List': '仅引用S01 Gap List',
   'E3': 'SKU编号被误抓', 'E5': 'SKU编号被误抓'},
 'B-nofreeze/D2-file-collab/stage01': {'P0': '仅作优先级参数出现', 'P1': '仅作优先级参数出现',
   'P2': '仅作优先级参数出现'},
 'B-none/D1-meeting-room/stage01': {'P0': '仅作优先级参数出现', 'P1': '仅作优先级参数出现',
   'P2': '仅作优先级参数出现'},
 'B-none/D1-meeting-room/stage03': {'G2': '仅标注部分解决', 'G3': '仅标注部分解决', 'G6': '仅标注部分解决'},
 'B-none/D2-file-collab/stage03': {'P0': '仅作优先级参数出现'},
 'B-none/D2-file-collab/stage01': {'P0': '仅指向GAP编号', 'P1': '仅指向GAP编号',
   'P2': '仅指向GAP编号', 'P3': '仅指向GAP编号'},
}

# J1 ④ 反事实：纯罗列/重复汇总（无新增信息）-> 删去不影响交付物
DUP_SUMMARY = {
 'A-full/D1-meeting-room/stage01': 'Gap-List',
 'B-nofreeze/D1-meeting-room/stage01': 'Gap-List',
 'B-none/D1-meeting-room/stage01': 'Gap-List',
 'A-full/D2-file-collab/stage01': 'Gaps',
 'B-nofreeze/D2-file-collab/stage01': 'Gaps',
 'B-none/D2-file-collab/stage01': 'Gap-List',
}

def apply_crossref(cell, items, judge):
    cf = dict(CROSSREF_FAIL.get(cell, {}))
    dup = DUP_SUMMARY.get(cell)
    if dup and judge.startswith('J1'):
        cf[dup] = '仅重复罗列其它条目'
    out = []
    for it in items:
        if it['id'] in cf:
            out.append({'id': it['id'], 'verdict': 'fail', 'tests_failed': ['②'],
                        'note': cf[it['id']][:30]})
        else:
            out.append(it)
    return out

FOUND_NOTES = {
 'B-none/D1-meeting-room/stage01': {k: '内容以A1.1.x等叶子呈现' for k in
   ['A1.1','A1.2','A1.3','A2.1','A2.2','A3.1','A3.2','A4.1','A4.2']},
 'B-none/D1-meeting-room/stage02': {'A1.3': '内容以A1.3.1/2叶子呈现'},
}

def build(cell, judge):
    ids = [r['id'] for r in ITEMS[cell]]
    if cell in S02_CELLS:
        items = s02_items(cell, judge, ids)
    else:
        items = apply_crossref(cell, mk(ids, notes=FOUND_NOTES.get(cell)), judge)
    return rows(cell, judge, items, MODEL)

def batch_cells(n):
    """批次 1..6 = config × domain（每批 3 stage × 2 judge）"""
    order = []
    for cfg in ['A-full', 'B-nofreeze', 'B-none']:
        for dom in ['D1-meeting-room', 'D2-file-collab']:
            order.append((cfg, dom))
    cfg, dom = order[n-1]
    return [f'{cfg}/{dom}/stage0{k}' for k in (1,2,3)]

def batch_rows(n, ts):
    out = []
    for cell in batch_cells(n):
        for judge in ['J1-strict-v3', 'J2-lenient-v3']:
            r = build(cell, judge)
            r['batch'] = n
            r['timestamp'] = ts
            out.append(r)
    return out
