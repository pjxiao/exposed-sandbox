import React from 'react';
import { Button, Container, Form } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { selectState, setApiKey, setClientId, login } from './loginSlice';

export function Login() {
    const {apiKey, clientId} = useSelector(selectState);
    const dispatch = useDispatch();
    return (
        <Container fluid="sm">
            <Form>
                <Form.Group>
                    <Form.Label>API Key</Form.Label>
                    <Form.Control
                        type="text"
                        value={apiKey}
                        onChange={e => dispatch(setApiKey(e.target.value))}
                    />
                </Form.Group>
                <Form.Group>
                    <Form.Label>Client ID</Form.Label>
                    <Form.Control
                        type="text"
                        value={clientId}
                        onChange={e => dispatch(setClientId(e.target.value))}
                    />
                </Form.Group>
            </Form>
            <Button onClick={() => dispatch(login())}>Login</Button>
        </Container>
    );
};
