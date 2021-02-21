export type Spreadseet = {
    spreadsheetId: string,
    title: string,
};

type Row = {
    spreadsheetId: string,
    rowIndex: number,
    cells: Array<number | string | null | undefined>,
};

const SPREADSHEETS_KEY = 'SPREADSHEETS';
const ROWS_KEY = 'ROWS';


export const list = (reload: boolean = false):Array<Spreadseet> => {
    return JSON.parse(window.localStorage.getItem(SPREADSHEETS_KEY) || '[]');
};


export const get = (spreadsheetId: string, sheetName: string): Promise<Row[]> => {
    let promise: Promise<Row[]>;
    const existings: Row[] = JSON.parse(window.localStorage.getItem(ROWS_KEY) || '[]');
    const rows: Row[] = existings.filter((row: Row) => row.spreadsheetId === spreadsheetId);
    if (rows.length > 0) {
        promise = new Promise((resolve) => resolve(rows));
    } else {
        promise = gapi.client?.sheets?.spreadsheets.values
            .get({spreadsheetId: spreadsheetId, range: sheetName})
            .then((response) => {
                if (response.result.values) {
                    const rows = response.result.values
                        .map((cells, rowIndex): Row => ({
                            spreadsheetId,
                            rowIndex,
                            cells,
                        }));
                    window.localStorage.setItem(ROWS_KEY, JSON.stringify(existings.concat(rows)));
                    return rows;
                } else {
                    throw Error(JSON.stringify(response));
                }
            });
    }
    if (promise) {
        return promise;
    } else {
        const err: Promise<Row[]> = new Promise((_, reject) => reject('Not authorized'))
        return err;
    }
};

export const del = (spreadsheetId: string) => {
    const sheets: Spreadseet[] = list().filter(s => s.spreadsheetId !== spreadsheetId);
    window.localStorage.setItem(SPREADSHEETS_KEY, JSON.stringify(sheets));

    const rows: Row[] = JSON.parse(window.localStorage.getItem(ROWS_KEY) || '[]')
        .filter((row: Row) => row.spreadsheetId !== spreadsheetId);
    window.localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
};

export const post = (spreadsheetId: string) => {
    const promise = gapi.client?.sheets?.spreadsheets
        .get({spreadsheetId})
        .then((response) => {
            console.log(response);
            const sheets = list();
            sheets.push({
                spreadsheetId,
                title: response.result.properties?.title || 'UNKNOWN',
            })
            window.localStorage.setItem(SPREADSHEETS_KEY, JSON.stringify(sheets));
        });
    return promise || new Promise((_, reject) => reject('Not authorized'))
};
