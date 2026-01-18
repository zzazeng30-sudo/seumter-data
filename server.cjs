// server.cjs
// [최종 통합 & 디버깅 강화 버전]
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const app = express();
// Render 배포 환경에서는 process.env.PORT를 우선적으로 사용해야 합니다.
const PORT = process.env.PORT || 3001; 

app.use(cors());
app.use(bodyParser.json());

// =================================================================
// 0. 서버 상태 확인 및 디버깅용 메인 경로
// =================================================================
app.get('/', (req, res) => {
    res.send('✅ 세움터 분석 및 VWorld 프록시 서버가 정상 작동 중입니다!');
});

// =================================================================
// 1. [핵심 해결] VWorld API 프록시 (영역 그리기 404 해결 및 상세 로그)
// =================================================================
app.get('/api/vworld/*', async (req, res) => {
    console.log("------- [VWorld Debug Start] -------");
    console.log("▶ 요청 시각:", new Date().toLocaleString());
    
    try {
        // 프론트엔드가 보낸 경로에서 /api/vworld를 제거하여 실제 VWorld 경로 추출
        const subPath = req.path.replace('/api/vworld', ''); 
        const targetUrl = `https://api.vworld.kr${subPath}`;
        
        console.log("▶ 프론트엔드 요청 경로:", req.path);
        console.log("▶ VWorld 최종 목적지:", targetUrl);
        console.log("▶ 전달된 쿼리 파라미터:", JSON.stringify(req.query));

        const response = await axios.get(targetUrl, { 
            params: req.query,
            timeout: 15000 
        });

        console.log("✅ VWorld 응답 성공!");
        console.log("------- [VWorld Debug End] -------");
        res.json(response.data);
    } catch (error) {
        console.error("❌ VWorld Proxy 에러 발생!");
        console.error("▶ 메시지:", error.message);
        
        if (error.response) {
            console.error("▶ VWorld 응답 상태 코드:", error.response.status);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'VWorld 요청 실패', details: error.message });
        }
        console.log("------- [VWorld Debug End] -------");
    }
});

// 공공데이터포털 API 프록시
app.get('/api/data-go/*', async (req, res) => {
    try {
        const apiPath = req.path.replace('/api/data-go', '');
        const targetUrl = `https://apis.data.go.kr${apiPath}`;
        console.log(`🌐 [DataGo Proxy] ${targetUrl}`);
        const response = await axios.get(targetUrl, { params: req.query });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'DataGo 요청 실패' });
    }
});

// =================================================================
// 2. 세움터 크롤링 로직 (기존 상세 로직 100% 유지)
// =================================================================

const BROWSER_HEADERS = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Content-Type': 'application/json;charset=UTF-8', 
    'X-Requested-With': 'XMLHttpRequest', 
    'untclsfcd': '1000',                  
    'Origin': 'https://www.eais.go.kr',
    'Referer': 'https://www.eais.go.kr/moct/awp/abb01/AWPABB01F13',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

const GITHUB_RAW_URL = "https://raw.githubusercontent.com/zzazeng30-sudo/dataqjqwjd/main/20260201dong.csv";

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function parseReportResponse(rawData) {
    if (typeof rawData !== 'string') return rawData;
    try {
        let clean = rawData.trim().replace(/^\(|\)$/g, '').replace(/'/g, '"');
        return JSON.parse(clean);
    } catch (e) { return null; }
}

function deepDecode(obj) {
    if (typeof obj === 'string') {
        if (obj.includes('%')) {
            try { return decodeURIComponent(obj).replace(/\+/g, " "); } catch (e) { return obj; }
        }
        return obj;
    } else if (Array.isArray(obj)) return obj.map(item => deepDecode(item));
    else if (typeof obj === 'object' && obj !== null) {
        const newObj = {};
        for (const key in obj) newObj[key] = deepDecode(obj[key]);
        return newObj;
    }
    return obj;
}

function extractDataPattern(obj, results = []) {
    if (Array.isArray(obj)) {
        if (obj.length >= 2 && obj[0] === "2,0,0,0,0" && Array.isArray(obj[1])) {
            const content = obj[1];
            if (content.length >= 2) {
                const chars = content[0]; 
                const coords = content[1]; 
                if (Array.isArray(chars)) {
                    const textCombined = chars.map(c => c === '+' ? ' ' : c).join('');
                    results.push({ text: textCombined, coordinates: coords });
                }
            }
        }
        for (const item of obj) extractDataPattern(item, results);
    } else if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) extractDataPattern(obj[key], results);
    }
    return results;
}

function classifyDataFinal(dataList, targetAddress) {
    console.log("\n⚡ [분류 로직] 데이터 정제 및 조립 시작...");
    const owners = [];
    let current = {};
    const patterns = {
        date: /^\d{4}[.\-\s]+\d{1,2}[.\-\s]+\d{1,2}[.\-\s]*$/,
        resNo: /\d{6}\s*[-~]\s*[1-4*][\d*]{6}/, 
        share: /([\d.]+\s*\/\s*[\d.]+)|\d+\s*분의\s*\d+|지분/,
        addressKeywords: ['시', '도', '구', '동', '면', '읍', '리', '로', '길', '아파트', '빌라', '층', '호'],
        reasonKeywords: ['소유권', '이전', '보존', '매매', '증여', '상속', '신탁', '교환', '변경', '등록', '환지', '압류', '가압류', '경매', '명의인', '주소변경'],
        nameStrict: /^[가-힣\s]{2,10}$/
    };

    const saveAndReset = () => {
        if (current.name || current.id || current.reason) {
            owners.push({
                name: current.name || '-', id: current.id || '-', address: current.address || '-',
                share: current.share || '-', date: current.date || '-', reason: current.reason || '-'
            });
        }
        current = {};
    };

    dataList.forEach(item => {
        let text = item.text.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/['"]/g, '');
        if (!text || text.includes("이하여백") || text === '-' || text === '.') return;

        if (patterns.resNo.test(text)) current.id = text;
        else if (patterns.date.test(text)) current.date = text.replace(/[.\-\s]+$/, '');
        else if (text.includes('/') || patterns.share.test(text)) current.share = text;
        else if (patterns.reasonKeywords.some(k => text.includes(k))) current.reason = text;
        else if (text.length > 5 && patterns.addressKeywords.some(k => text.includes(k))) {
            current.address = current.address ? current.address + " " + text : text;
        } else if (text.endsWith(')') || text.startsWith('(')) {
            current.address = current.address ? current.address + " " + text : text;
        } else if (patterns.nameStrict.test(text.replace(/\s/g, '')) && !/[0-9./\-]/.test(text)) {
            if (current.name) saveAndReset();
            current.name = text;
        }
    });
    saveAndReset();
    return owners.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.id === v.id && t.date === v.date)) === i);
}

async function clearCart(client) {
    try {
        const r05Res = await client.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 });
        const list = r05Res.data?.findPbsvcResveDtls; 
        if (list) {
            for (const item of list) await client.post('/bci/BCIAAA02D01', item);
        }
    } catch (e) {}
}

app.post('/api/scrape', async (req, res) => {
    console.log("\n🚀 [API REQUEST] Analysis Started");
    const { id, pw, address } = req.body;
    if (!id || !pw || !address) return res.status(400).json({ success: false, message: "Missing info" });

    const jar = new CookieJar();
    const client = wrapper(axios.create({ baseURL: 'https://www.eais.go.kr', jar, withCredentials: true, timeout: 60000, headers: BROWSER_HEADERS }));

    try {
        await client.get('/'); 
        await client.post('/awp/AWPABB01R01', { loginId: id, loginPwd: pw });
        await clearCart(client);
        
        const csvRes = await axios.get(GITHUB_RAW_URL);
        const lines = csvRes.data.split(/\r?\n/);
        const addrParts = address.trim().split(/\s+/);
        const regionKeywords = addrParts.filter(part => isNaN(parseInt(part.replace(/-/g, ""))));
        
        let mapping = null;
        for (let line of lines) {
            const clean = line.replace(/["\r]/g, '').trim();
            if (regionKeywords.every(keyword => clean.includes(keyword))) {
                const cols = clean.split(',');
                mapping = { sigungu: cols[0].substring(0, 5), bjdong: cols[0].substring(5, 10) };
                break;
            }
        }
        if (!mapping) throw new Error("BJD mapping failed");

        const bunjiMatch = address.match(/(\d+)(-(\d+))?$/);
        const mnnm = bunjiMatch ? bunjiMatch[1].padStart(4, '0') : "0000";
        const slno = (bunjiMatch && bunjiMatch[3]) ? bunjiMatch[3].padStart(4, '0') : "0000";

        let list = null, selectedType = "0";
        for (const type of [{c:"0",n:"대지"}, {c:"1",n:"산"}, {c:"2",n:"블록"}]) {
            const sRes = await client.post('/bci/BCIAAA02R01', { addrGbCd: "0", inqireGbCd: "0", bldrgstCurdiGbCd: "0", platGbCd: type.c, reqSigunguCd: mapping.sigungu, bjdongCd: mapping.bjdong, mnnm, slno });
            const result = sRes.data?.jibunAddr || sRes.data?.bldrgstList;
            if (result && result.length > 0) { list = result; selectedType = type.c; break; }
        }
        if (!list) throw new Error("No building info found");

        await client.post('/bci/BCIAAA02C01', { bldrgstSeqno: list[0].bldrgstSeqno, regstrGbCd: list[0].regstrGbCd || "1", regstrKindCd: list[0].regstrKindCd || "2", bldrgstCurdiGbCd: "0", locPlatGbCd: selectedType, locSigunguCd: mapping.sigungu, locBjdongCd: mapping.bjdong, locDetlAddr: address, locMnnm: mnnm, locSlno: slno });
        await sleep(2000); 

        const r05 = await client.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 });
        const target = r05.data?.findPbsvcResveDtls?.find(i => i.bldrgstSeqno === list[0].bldrgstSeqno);
        await client.post('/bci/BCIAZA02S01', { appntInfo: { appntGbCd: "01", appntNm: "신청인" }, bldrgstGbCd: "1", pbsvcRecpInfo: { pbsvcGbCd: "01", issueReadGbCd: "0", pbsvcResveDtlsCnt: 1 }, pbsvcResveDtls: [target] });

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let successItem = null;
        for (let i = 0; i < 20; i++) { 
            await sleep(3000);
            const r01 = await client.post('/bci/BCIAAA06R01', { firstSaveEndDate: today, firstSaveStartDate: today, recordSize: 10, progStateFlagArr: ["01"] });
            if (r01.data?.IssueReadHistList?.[0]) { successItem = r01.data.IssueReadHistList[0]; break; }
        }
        if (!successItem) throw new Error("Wait timeout");

        const dRes = await client.post('/bci/BCIAAA06R03', { issueReadAppDate: today, pbsvcRecpNo: successItem.pbsvcRecpNo });
        const oof = `<?xml version='1.0' encoding='utf-8'?><oof version='3.0'><document title='' enable-thread='0'><file-list><file type='crf.root' path='%root%/crf/bci/djrBldrgstGnrl.crf'></file></file-list><connection-list><connection type='file' namespace='XML1'><config-param-list><config-param name='path'>/cais_data/issue/${today.substring(0,4)}/${today.substring(4,6)}/${today.substring(6,8)}/${successItem.pbsvcRecpNo}/${successItem.pbsvcRecpNo}.xml</config-param></config-param-list><content content-type='xml' namespace='*'><content-param name='encoding'>euc-kr</content-param><content-param name='root'>{%dataset.xml.root%}</content-param></content></connection></connection-list><field-list type="name"><field name='FILE_ID'>${dRes.data.count.FILE_ID}</field><field name='SVR_HOST'>156.177:7000</field></field-list></document></oof>`;

        const r1 = await client.post('/report/RPTCAA02R02', `ClipID=R01&oof=${encodeURIComponent(oof)}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });
        const uid = parseReportResponse(r1.data).uid;
        const r2 = await client.post('/report/RPTCAA02R02', `uid=${uid}&clipUID=${uid}&ClipType=DocumentPageView&ClipData=${encodeURIComponent(JSON.stringify({"reportkey":uid,"isMakeDocument":true,"pageMethod":0}))}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });
        const decoded = JSON.parse(Buffer.from(parseReportResponse(r2.data).resValue.viewData.replace(/\s/g, ""), 'base64').toString('utf-8'));
        const ownerList = classifyDataFinal(extractDataPattern(deepDecode(decoded)).slice(0, extractDataPattern(deepDecode(decoded)).findIndex(i => i.text.includes("건축물 현황"))), address);
        
        res.json({ success: true, data: ownerList });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    } finally {
        await clearCart(client);
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));