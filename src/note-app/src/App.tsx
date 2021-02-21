import React from 'react';
import { useSelector } from 'react-redux';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Login } from './features/login/Login';
import { selectState } from './features/login/loginSlice';
import { Training } from './features/training/Training';

function App() {
  const loginState = useSelector(selectState).state;

  if (loginState === 'REQUESTED') {
    return (
      <Login />
    );
  } else {
    return (
      <Training />
    );
  }
}

export default App;
