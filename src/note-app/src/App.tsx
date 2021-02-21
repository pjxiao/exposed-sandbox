import React from 'react';
import { useSelector } from 'react-redux';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Login } from './features/login/Login';
import { selectState } from './features/login/loginSlice';
import { Training } from './features/training/Training';
import { Col, Container, Row } from 'react-bootstrap';

function App() {
  const loginState = useSelector(selectState).state;

  if (loginState === 'REQUESTED') {
    return (
      <Login />
    );
  } else {
    return (
      <Container fluid="sm">
        <Row>
          <Col>
            <Training />
          </Col>
        </Row>
      </Container>
    );
  }

}

export default App;
