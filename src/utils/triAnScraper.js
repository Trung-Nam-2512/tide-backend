const https = require('https');
const cheerio = require('cheerio');

const tDic = {
    "Tuyên Quang": "tuyen_quang",
    "Lai Châu": "lai_chau",
    "Bản Chát": "ban_chat",
    "Huội Quảng": "huoi_quang",
    "Sơn La": "son_la",
    "Hòa Bình": "hoa_binh",
    "Thác Bà": "thac_ba",
    "Trung Sơn": "trung_son",
    "Bản Vẽ": "ban_ve",
    "Quảng Trị": "quang_tri",
    "A Vương": "a_vuong",
    "Sông Bung 2": "song_bung_2",
    "Vĩnh Sơn A": "vinh_son_a",
    "Sông Bung 4": "song_bung_4",
    "Vĩnh Sơn B": "vinh_son_b",
    "Vĩnh Sơn C": "vinh_son_c",
    "Sông Tranh 2": "song_tranh_2",
    "Sông Ba Hạ": "song_ba_ha",
    "Sông Hinh": "song_hinh",
    "Thượng Kon Tum": "thuong_kon_tum",
    Pleikrông: "pleikrong",
    Ialy: "ialy",
    "Sê San 3": "se_san_3",
    "Sê San 3A": "se_san_3a",
    "Sê San 4": "se_san_4",
    Kanak: "kanak",
    "An Khê": "an_khe",
    "Srêpốk 3": "srepok_3",
    "Buôn Kuốp": "buon_kuop",
    "Buôn Tua Srah": "buon_tua_srah",
    "Đồng Nai 3": "dong_nai_3",
    "Đồng Nai 4": "dong_nai_4",
    "Đơn Dương": "don_duong",
    "Đại Ninh": "dai_ninh",
    "Hàm Thuận": "ham_thuan",
    "Đa Mi": "da_mi",
    "Trị An": "tri_an",
    "Thác Mơ": "thac_mo",
};

function formatDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function convertToFullDate(input) {
    if (!input || typeof input !== "string") return null;
    const tokens = input.trim().split(/\s+/);
    let timeToken = null;
    let dateToken = null;

    for (const token of tokens) {
        if (!timeToken && /^\d{1,2}:\d{2}$/.test(token)) timeToken = token;
        if (!dateToken && /^\d{1,2}\/\d{1,2}$/.test(token)) dateToken = token;
    }

    if (!timeToken || !dateToken) return null;

    const [hour, minute] = timeToken.split(":").map(Number);
    const [day, month] = dateToken.split("/").map(Number);
    if (
        isNaN(hour) || isNaN(minute) || isNaN(day) || isNaN(month) ||
        hour > 23 || minute > 59 || day < 1 || day > 31 || month < 1 || month > 12
    ) {
        return null;
    }

    const now = new Date();
    let year = now.getFullYear();
    if (month > now.getMonth() + 1) {
        year -= 1;
    }

    const paddedMonth = String(month).padStart(2, "0");
    const paddedDay = String(day).padStart(2, "0");
    const paddedHour = String(hour).padStart(2, "0");
    const paddedMinute = String(minute).padStart(2, "0");
    return `${year}-${paddedMonth}-${paddedDay} ${paddedHour}:${paddedMinute}:00`;
}

async function getTriAnData() {
    const url = `https://hochuathuydien.evn.com.vn/PageHoChuaThuyDienEmbedEVN.aspx?td=${encodeURIComponent(formatDateTime())}`;
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const $ = cheerio.load(data);
                const table = $('table.tblgridtd').first();
                const rows = table.find('tr');
                let result = [];
                rows.each((i, row) => {
                    const cells = $(row).find('td, th');
                    const rowData = [];
                    cells.each((j, cell) => rowData.push($(cell).text().trim()));
                    if (rowData.length > 0) result.push(rowData);
                });

                if (result.length > 1) {
                    const headers = result[0].map(h => h === 'ΣQx' ? 'sumQx' : h);
                    const json = result.slice(1).map(row => {
                        const obj = {};
                        row.forEach((val, i) => obj[headers[i]] = val);
                        return obj;
                    });

                    const triAnData = json.find(item => item['Tên hồ'].includes('Trị An'));
                    if (!triAnData) return resolve(null);

                    const timeRaw = triAnData['Thời điểm'];
                    const time = convertToFullDate(timeRaw);
                    if (!time) return resolve(null);

                    const newData = {
                        time: new Date(time),
                        htl: parseFloat(triAnData.Htl) || 0,
                        hdbt: parseFloat(triAnData.Hdbt) || 0,
                        hc: parseFloat(triAnData.Hc) || 0,
                        qve: parseFloat(triAnData.Qve) || 0,
                        sumQx: parseFloat(triAnData['ΣQx']) || 0,
                        qxt: parseFloat(triAnData.Qxt) || 0,
                        qxm: parseFloat(triAnData.Qxm) || 0,
                        ncxs: parseFloat(triAnData.Ncxs) || 0,
                        ncxm: parseFloat(triAnData.Ncxm) || 0
                    };
                    resolve(newData);
                } else {
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

module.exports = { getTriAnData };