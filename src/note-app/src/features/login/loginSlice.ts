import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppThunk, RootState } from "../../app/store";

type State = 'PENDING' | 'REQUESTED' | 'AUTHED';

interface LoginState {
    state: State;
    apiKey: string,
    clientId: string,
};

const initialState: LoginState = {
    state: 'PENDING',
    apiKey: '',
    clientId: '',
};

/*
    params: JSON.stringify({
      apiKey: 'YOUR_API_KEY',
      clientId: 'YOUR_CLIENT_ID',
      scope: 'https://www.googleapis.com/auth/drive.metadata.readonly',
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
  }),
*/

export const loginSlice = createSlice({
    name: 'login',
    initialState,
    reducers: {
        setApiKey: (state, action: PayloadAction<string>) => {
            state.apiKey = action.payload;
        },
        setClientId: (state, action: PayloadAction<string>) => {
            state.clientId = action.payload;
        },
        setState: (state, action: PayloadAction<State>) => {
            state.state = action.payload;
        },
    }
});

export const {setApiKey, setClientId, setState} = loginSlice.actions;

export const selectState = (state: RootState) => state.login;

export const login = (): AppThunk => (dispatch, getState) => {
    const {apiKey, clientId} = getState().login;
    const params = {
      apiKey: apiKey,
      clientId: clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4']
    };
    gapi.load('client:auth2', () => {
        console.log('client:auth2 has been loaded');
        // console.log(JSON.stringify(params));
        gapi.client
            .init(params)
            .then(() => {
                const googleAuth = gapi.auth2.getAuthInstance();
                googleAuth.isSignedIn.listen(() => dispatch(setState('AUTHED')));
                googleAuth.signIn().then(() => dispatch(setState('AUTHED')));
            })
            .catch((e) => console.error(e));
    });
};

export default loginSlice.reducer;
