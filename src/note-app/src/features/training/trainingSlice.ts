import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppThunk, RootState } from "../../app/store";
import { post as postSpreadsheet, get as getSpreadsheet } from "../../repositories/SpreadsheetRepository";
import { setState as setLoginState } from "../../features/login/loginSlice";

const COL_SECTION = 'section';
const COL_NUMBER = '#';
const COL_JA = '日本語';
const COL_EN = '英語';
const COL_NOTE = '解説';

type State = 'READY' | 'LOADING' | 'LOADED' | 'FAILED';
type Visibility = 'HIDDEN' | 'SHOWN';

interface Row {
    section: number,
    num: number,
    ja: string,
    en: string,
    note: string,
};

interface TrainingState {
    state: State;
    spreadsheetId: string | null,
    sheet: string | null,
    data: null | Array<Row>,
    ptr: number,
    visibility: Visibility,
};


/*
const EXAMPLE: Array<Row> = [
    {"section":1,"num":1,"ja":"スーザンの家のいちばん大きい部屋は居間でです。","en":"The largetst room in Suzan's house is the living room.","note":""},
    {"section":1,"num":2,"ja":"（その）隣の部屋は食堂です。","en":"The next room is the dining room.","note":""},
    {"section":1,"num":3,"ja":"浴室は玄関のはずれにあります。","en":"The bathroom is at the end of the hall.","note":""},
];
*/

const initialState: TrainingState = {
    state: 'READY',
    spreadsheetId: null,
    sheet: 'Sheet1',
    data: null,
    ptr: 0,
    visibility: 'HIDDEN',
    // state: 'LOADED',
    // spreadsheetId: 'XXX',
    // data: EXAMPLE,
};


export const trainingSlice = createSlice({
    name: 'training',
    initialState,
    reducers: {
        clearState: (state) => {
            state.state = 'READY';
            state.spreadsheetId = null;
            state.data = null;
        },
        setState: (state, action: PayloadAction<State>) => {
            state.state = action.payload;
        },

        setSpreadsheetId: (state, action: PayloadAction<string>) => {
            state.spreadsheetId = action.payload;
        },

        setData: (state, action: PayloadAction<Array<Row>>) => {
            state.data = action.payload;
        },

        next: (state) => {
            if (
                state.data !== null &&
                state.ptr < (state.data.length - 1)
            ) {
                state.ptr++;
                state.visibility = 'HIDDEN';
            }
        },

        toggleVisibility: (state) => {
            if (state.data !== null) {
                if (state.visibility === 'HIDDEN') {
                    state.visibility = 'SHOWN';
                }
                else if (state.visibility === 'SHOWN') {
                    state.visibility = 'HIDDEN';
                }
            }
        },

        prev: (state) => {
            if (
                state.data !== null &&
                state.ptr > 0
            ) {
                state.ptr--;
                state.visibility = 'HIDDEN';
            }
        },
    }
});

export const {clearState, setState, setSpreadsheetId, setData, next, prev, toggleVisibility} = trainingSlice.actions;

export const selectCurrent = (state: RootState) =>
    state.training.data === null
        ? null
        : state.training.data[state.training.ptr]
;
export const selectState = (state: RootState) => state.training;

export const post = (spreadsheetId: string): AppThunk => (dispatch, getState) => {
    postSpreadsheet(spreadsheetId)
        .catch(e => {
            if (e === 'Not authorized') {
                dispatch(setLoginState('REQUESTED'));
            }
        }).catch(console.error);
};

export const openSpreadsheet = (spreadsheetId: string): AppThunk => (dispatch) => {
    dispatch(setState('LOADING'))
    getSpreadsheet(spreadsheetId, 'Sheet1')
        .then(allRows => {
            const [header, rows] = [allRows[0], allRows.slice(1)]
            const colMap: {[key: string]: number} = Object.fromEntries(
                header.cells
                .filter(cell => !!cell)
                .map((cell, idx) => [cell, idx])
            );
            const data = rows
                .map((row) => ({
                    section: Number(row.cells[colMap[COL_SECTION]]) || 0,
                    num: Number(row.cells[colMap[COL_NUMBER]]) || 0,
                    ja: String(row.cells[colMap[COL_JA]] || ''),
                    en: String(row.cells[colMap[COL_EN]] || ''),
                    note: String(row.cells[colMap[COL_NOTE]] || ''),
                }));
            dispatch(setState('LOADED'))
            dispatch(setSpreadsheetId(spreadsheetId))
            dispatch(setData(data));
            console.log('loaded', {data})
        })
        .catch(e => {
            if (e === 'Not authorized') {
                dispatch(setLoginState('REQUESTED'));
            }
        }).catch(console.error);
};


export default trainingSlice.reducer;

