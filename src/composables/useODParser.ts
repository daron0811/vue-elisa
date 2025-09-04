export interface ParseResult {
    data: number[][]; // 固定 8x12
    warnings: string[];
}


/**
* 建立 rows x cols 的 0 矩陣
*/
export function makeZeroGrid(rows = 8, cols = 12): number[][] {
    return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));
}


/**
* 將貼上文字解析成 8x12 的數字矩陣
* - 支援分隔：Tab（建議/Excel）、逗號、分號、空白
* - 多於 8 列或某列超過 12 欄會拋出錯誤
* - 空白或無法轉成數字的欄位會填 0 並記錄 warnings
*/
export function parseODGrid(input: string, rows = 8, cols = 12): ParseResult {
    if (!input || input.trim() === '') {
        return { data: makeZeroGrid(rows, cols), warnings: [] };
    }


    const lines = input
        .split(/\r?\n/)
        .map((l) => l.trimEnd()) // 保留前端空白以避免影響 Tab 判斷
        .filter((l) => l.length > 0);


    const data: number[][] = [];
    const warnings: string[] = [];


    const splitLine = (line: string): string[] => {
        if (line.includes('\t')) return line.split('\t');
        if (line.includes(',')) return line.split(',');
        if (line.includes(';')) return line.split(';');
        // 萬用：連續空白視為一個分隔
        return line.trim().split(/\s+/);
    };


    for (let r = 0; r < lines.length; r++) {
        const raw = splitLine(lines[r]);
        if (raw.length > cols) {
            throw new Error(`第 ${r + 1} 列欄位數超過 ${cols}（實際 ${raw.length}）`);
        }
        const row: number[] = [];


        for (let c = 0; c < raw.length; c++) {
            const token = raw[c].trim();
            if (token === '') {
                row.push(0);
                if (warnings.length < 20) warnings.push(`第 ${r + 1} 列第 ${c + 1} 欄為空，已填 0`);
                continue;
            }
            const v = Number(token.replace(/\s/g, ''));
            if (Number.isFinite(v)) {
                row.push(v);
            } else {
                row.push(0);
                if (warnings.length < 20) warnings.push(`第 ${r + 1} 列第 ${c + 1} 欄（"${token}"）不是數字，已填 0`);
            }
        }


        // 右側補 0 至 12 欄
        while (row.length < cols) row.push(0);
        data.push(row);
        if (data.length > rows) {
            throw new Error(`貼上的列數超過 ${rows} 列（實際 ${data.length}）`);
        }
    }


    // 底部補 0 至 8 列
    while (data.length < rows) data.push(Array.from({ length: cols }, () => 0));


    return { data, warnings };
}