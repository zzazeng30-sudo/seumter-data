// server.cjs
// [최종 통합 버전] 모든 크롤링 로직 + VWorld/공공데이터 프록시 통합

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const app = express();
// Render 환경에서는 process.env.PORT를 사용해야 합니다.
const PORT = process.env.PORT || 3001; 

app.use(cors());
app.use(bodyParser.json());

// ★ [추가] 서버 상태 확인용 메인 경로 (Cannot GET / 해결)
app.get('/', (req, res) => {
    res.send('✅ 세움터 및 VWorld 프록시 서버가 정상 작동 중입니다!');
});

// ★ [필수] 브라우저 위장 헤더 (세움터용)
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

// =================================================================
// ★ 프록시 설정 (영역 그리기 404 해결)
// =================================================================

// 1. VWorld API 프록시
app.get('/api/vworld/*', async (req, res) => {
    try {
        const apiPath = req.path.replace('/api/vworld', ''); 
        const targetUrl = `https://api.vworld.kr${apiPath}`;
        console.log(`🌐 [VWorld Proxy] ${targetUrl}`);
        const response = await axios.get(targetUrl, { params: req.query });
        res.json(response.data);
    } catch (error) {
        console.error('❌ VWorld Proxy Error:', error.message);
        res.status(500).json({ error: 'VWorld 요청 실패', details: error.message });
    }
});

// 2. 공공데이터포털 API 프록시
app.get('/api/data-go/*', async (req, res) => {
    try {
        const apiPath = req.path.replace('/api/data-go', '');
        const targetUrl = `https://apis.data.go.kr${apiPath}`;
        console.log(`🌐 [DataGo Proxy] ${targetUrl}`);
        const response = await axios.get(targetUrl, { params: req.query });
        res.json(response.data);
    } catch (error) {
        console.error('❌ DataGo Proxy Error:', error.message);
        res.status(500).json({ error: 'DataGo 요청 실패', details: error.message });
    }
});

// =================================================================
// 보조 함수 및 추출 로직 (기존 로직 100% 유지)
// =================================================================

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

function parseReportResponse(rawData) {
    if (typeof rawData !== 'string') return rawData;
    try {
        let clean = rawData.trim().replace(/^\(|\)$/g, '');
        clean = clean.replace(/'/g, '"');
        return JSON.parse(clean);
    } catch (e) { return null; }
}

function deepDecode(obj) {
    if (typeof obj === 'string') {
        if (obj.includes('%')) {
            try { return decodeURIComponent(obj).replace(/\+/g, " "); } catch (e) { return obj; }
        }
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map(item => deepDecode(item));
    } else if (typeof obj === 'object' && obj !== null) {
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

    const isEmpty = (obj) => Object.keys(obj).length === 0;

    const saveAndReset = () => {
        if (!isEmpty(current)) {
            current.name = current.name || '-';
            current.id = current.id || '-';
            current.address = current.address || '-';
            current.share = current.share || '-';
            current.date = current.date || '-';
            current.reason = current.reason || '-';
            
            if (current.name !== '-' || current.id !== '-' || current.reason !== '-') {
                owners.push(current);
            }
        }
        current = {};
    };

    dataList.forEach((item, index) => {
        let text = item.text.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/['"]/g, '');
        
        if (!text || text.includes("이하여백") || text.includes("페이지") || text === '-' || text === '.') return;

        let type = "UNKNOWN";

        if (patterns.resNo.test(text)) type = 'id';
        else if (patterns.date.test(text)) { text = text.replace(/[.\-\s]+$/, ''); type = 'date'; }
        else if (text.includes('/') || patterns.share.test(text)) type = 'share';
        else if (patterns.reasonKeywords.some(k => text.includes(k))) type = 'reason';
        else if (text.length > 5 && patterns.addressKeywords.some(k => text.includes(k))) type = 'address';
        else if (text.endsWith(')') || text.startsWith('(')) type = 'address_part';
        else {
            const isHangul = patterns.nameStrict.test(text.replace(/\s/g, ''));
            const hasNumber = /[0-9]/.test(text); 
            const hasSpecial = /[./\-]/.test(text);
            if (isHangul && !hasNumber && !hasSpecial) type = 'name';
        }

        if (type !== "UNKNOWN") {
            if (type === 'address' || type === 'address_part') {
                if (current['address']) {
                    current['address'] += " " + text;
                } else if (type === 'address') {
                    current['address'] = text;
                }
            } 
            else if (current[type]) {
                saveAndReset();
                current[type] = text;
            } else {
                current[type] = text;
            }
        }
    });

    saveAndReset();
    const uniqueOwners = owners.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.id === v.id && t.date === v.date)) === i);
    return uniqueOwners.length === 0 ? [] : uniqueOwners;
}

async function clearCart(client) {
    try {
        const r05Res = await client.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 });
        const list = r05Res.data?.findPbsvcResveDtls; 
        if (list && list.length > 0) {
            console.log(`Sweep: Cleaning cart (${list.length} items)`);
            for (const item of list) {
                try { await client.post('/bci/BCIAAA02D01', item); } catch (e) {}
            }
        }
    } catch (e) {}
}

// =================================================================
// 메인 스크래핑 엔드포인트
// =================================================================

app.post('/api/scrape', async (req, res) => {
    console.log("\n🚀 [API REQUEST] Analysis Started");
    const { id, pw, address } = req.body;
    
    if (!id || !pw || !address) {
        return res.status(400).json({ success: false, message: "Missing info" });
    }

    const jar = new CookieJar();
    const client = wrapper(axios.create({
        baseURL: 'https://www.eais.go.kr',
        jar, withCredentials: true, timeout: 60000,
        headers: BROWSER_HEADERS 
    }));

    try {
        // 1. Login
        await client.get('/'); 
        const loginRes = await client.post('/awp/AWPABB01R01', { loginId: id, loginPwd: pw });
        if (loginRes.data?.userNm || loginRes.data?.reMsg === '성공') {
            console.log(`✅ [LOGIN SUCCESS] ${loginRes.data.userNm || 'User'}`);
        }
        await client.get('/cba/CBAAZA02R01'); 
        await clearCart(client);
        
        // 2. Mapping
        let csvData;
        try {
            const csvRes = await axios.get(GITHUB_RAW_URL);
            csvData = csvRes.data;
        } catch (e) { throw new Error("Region code load failed"); }

        const lines = csvData.split(/\r?\n/);
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

        // 3. Search
        const platTypes = [{c:"0",n:"대지"}, {c:"1",n:"산"}, {c:"2",n:"블록"}];
        if (address.includes('산')) platTypes.unshift(platTypes.splice(1, 1)[0]);

        let list = null;
        let selectedType = "0";

        for (const type of platTypes) {
            try {
                const sRes = await client.post('/bci/BCIAAA02R01', {
                    addrGbCd: "0", inqireGbCd: "0", bldrgstCurdiGbCd: "0", 
                    platGbCd: type.c, reqSigunguCd: mapping.sigungu, bjdongCd: mapping.bjdong, mnnm: mnnm, slno: slno
                });
                const result = sRes.data?.jibunAddr || sRes.data?.bldrgstList;
                if (result && result.length > 0) {
                    list = result;
                    selectedType = type.c;
                    break;
                }
            } catch (e) {}
        }

        if (!list) throw new Error("No building info found");
        const item = list[0]; 

        // 4. Register (Application)
        await client.post('/bci/BCIAAA02C01', { 
            bldrgstSeqno: item.bldrgstSeqno, regstrGbCd: item.regstrGbCd || "1", regstrKindCd: item.regstrKindCd || "2",
            mjrfmlyIssueYn: "N", rntyBrhsIssueYn: "N", bldrgstCurdiGbCd: "0", ownrYn: "N", multiUseBildYn: "N", 
            locPlatGbCd: selectedType, locSigunguCd: mapping.sigungu, locBjdongCd: mapping.bjdong, 
            locDetlAddr: address, locMnnm: mnnm, locSlno: slno, locBldNm: item.bldNm || "", locDongNm: item.dongNm || ""
        });
        
        await sleep(1500); 

        const r05Res = await client.post('/bci/BCIAAA02R05', { inqireGbCd: "1", pageIndex: 1 });
        const targetItem = r05Res.data?.findPbsvcResveDtls?.find(i => i.bldrgstSeqno === item.bldrgstSeqno);
        if (!targetItem) throw new Error("Cart sync failed");

        await client.post('/bci/BCIAZA02S01', {
            appntInfo: { appntGbCd: "01", appntNm: "신청인" },
            bldrgstGbCd: "1", ownrExprsYn: "N", 
            pbsvcRecpInfo: { pbsvcGbCd: "01", issueReadGbCd: "0", pbsvcResveDtlsCnt: 1 },
            pbsvcResveDtls: [targetItem]
        });

        await client.post('/bci/BCIAAA02D02', { lastUpdusrId: id });
        await client.get('/cba/CBAAZA02R01');
        await client.post('/awp/AWPABB01R20', {});

        // 5. Wait for generation
        console.log(`⏳ Waiting for document...`);
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let successItem = null;
        for (let i = 0; i < 20; i++) { 
            await sleep(3000);
            try {
                const reportRes = await client.post('/bci/BCIAAA06R01', { firstSaveEndDate: today, firstSaveStartDate: today, recordSize: 10, progStateFlagArr: ["01"] });
                successItem = reportRes.data?.IssueReadHistList?.[0]; 
                if (successItem && successItem.pbsvcRecpNo) break;
            } catch (e) {}
        }
        if (!successItem) throw new Error("Wait timeout");

        // 6. Extraction
        const recpNo = successItem.pbsvcRecpNo;
        const dRes = await client.post('/bci/BCIAAA06R03', { issueReadAppDate: today, pbsvcRecpNo: recpNo });
        const fileId = dRes.data.count?.FILE_ID;
        const y = today.substring(0,4), m = today.substring(4,6), d = today.substring(6,8);
        const xmlPath = `/cais_data/issue/${y}/${m}/${d}/${recpNo}/${recpNo}.xml`;
        const oof = `<?xml version='1.0' encoding='utf-8'?><oof version='3.0'><document title='' enable-thread='0'><file-list><file type='crf.root' path='%root%/crf/bci/djrBldrgstGnrl.crf'></file></file-list><connection-list><connection type='file' namespace='XML1'><config-param-list><config-param name='path'>${xmlPath}</config-param></config-param-list><content content-type='xml' namespace='*'><content-param name='encoding'>euc-kr</content-param><content-param name='root'>{%dataset.xml.root%}</content-param></content></connection></connection-list><field-list type="name"><field name='FILE_ID'>${fileId}</field><field name='SVR_HOST'>156.177:7000</field></field-list></document></oof>`;

        const r1 = await client.post('/report/RPTCAA02R02', `ClipID=R01&oof=${encodeURIComponent(oof)}`, { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });
        const uid = parseReportResponse(r1.data)?.uid;
        if (!uid) throw new Error("Report UID failed");

        const r2Params = `uid=${uid}&clipUID=${uid}&ClipType=DocumentPageView&ClipData=${encodeURIComponent(JSON.stringify({"reportkey":uid,"isMakeDocument":true,"pageMethod":0}))}`;
        const r2 = await client.post('/report/RPTCAA02R02', r2Params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' } });

        const r2Json = parseReportResponse(r2.data);
        const viewData = r2Json.resValue.viewData.replace(/\s/g, "");
        const decodedString = Buffer.from(viewData, 'base64').toString('utf-8');
        const dataObj = JSON.parse(decodedString);
        
        const decodedResult = deepDecode(dataObj);
        const fullList = extractDataPattern(decodedResult);
        
        const splitIndex = fullList.findIndex(item => item.text.includes("건축물 현황"));
        const finalRawData = splitIndex === -1 ? fullList : fullList.slice(0, splitIndex);

        const ownerList = classifyDataFinal(finalRawData, address);
        
        console.log(`✅ [COMPLETE] Extracted: ${ownerList.length} persons`);
        res.json({ success: true, data: ownerList });

    } catch (e) {
        console.error(`❌ ERROR: ${e.message}`);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (client) await clearCart(client);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});