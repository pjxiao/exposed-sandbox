import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppThunk, RootState } from "../../app/store";

const COL_SECTION = 'section';
const COL_NUMBER = '#';
const COL_JA = '日本語';
const COL_EN = '英語';
const COL_GRAMMAR = '構文';
const COL_NOTE = '備考';

type State = 'READY' | 'LOADING' | 'LOADED' | 'FAILED';
type Visibility = 'HIDDEN' | 'SHOWN';

interface Row {
    section: number,
    num: number,
    ja: string,
    en: string,
    grammar: string,
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


const EXAMPLE: Array<Row> = [
    {"section":1,"num":1,"ja":"スーザンの家のいちばん大きい部屋は居間でです。","en":"The largetst room in Suzan's house is the living room.","grammar":"","note":""},
    {"section":1,"num":2,"ja":"（その）隣の部屋は食堂です。","en":"The next room is the dining room.","grammar":"","note":""},
    {"section":1,"num":3,"ja":"浴室は玄関のはずれにあります。","en":"The bathroom is at the end of the hall.","grammar":"","note":""},
];

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

export const {setState, setSpreadsheetId, setData, next, prev, toggleVisibility} = trainingSlice.actions;

export const selectCurrent = (state: RootState) =>
    state.training.data === null
        ? null
        : state.training.data[state.training.ptr]
;
export const selectState = (state: RootState) => state.training;

export const load = (): AppThunk => (dispatch, getState) => {
    const {spreadsheetId, sheet} = getState().training;
    console.log('start load', {spreadsheetId, sheet});
    if (spreadsheetId && sheet) {
        dispatch(setState('LOADING'));
        gapi.client.sheets.spreadsheets.values
            .get({spreadsheetId: spreadsheetId, range: sheet})
            .then((response) => {
                if (response.result.values) {
                    const colMap: {[key: string]: number} = Object.fromEntries(
                        response.result.values[0]
                        .filter(cell => !!cell)
                        .map((cell, idx) => [cell, idx])
                    );
                    const data = response.result.values
                        .slice(1)
                        .map((row) => ({
                            section: Number(row[colMap[COL_SECTION]]) || 0,
                            num: Number(row[colMap[COL_NUMBER]]) || 0,
                            ja: row[colMap[COL_JA]] || '',
                            en: row[colMap[COL_EN]] || '',
                            grammar: row[colMap[COL_GRAMMAR]] || '',
                            note: row[colMap[COL_NOTE]] || '',
                        }));
                    dispatch(setData(data));
                    console.log('loaded', {data})
                }
                dispatch(setState('LOADED'));
            })
            .catch(function () {
                console.error({arguments});
                dispatch(setState('FAILED'));
            })
    }
};

export default trainingSlice.reducer;

